"""RAG Engine: Retrieve relevant chunks and generate answers"""

import json
import pickle
import re
import sys
import time
import uuid
from pathlib import Path
from typing import Optional

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    BM25Okapi = None

# Add src directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    GENERATION_MODEL,
    FAISS_INDEX_DIR,
    FAISS_INDEX_DIR_GEMINI,
    RETRIEVAL_TOP_K,
    CONTEXT_TOKEN_BUDGET,
    CHAT_HISTORY_CONTEXT,
    BM25_TOP_K,
    HYBRID_MERGE_TOP_K,
    RERANK_TOP_K,
)
from prompts import (
    TAX_QA_SYSTEM_PROMPT, TAX_QA_USER_PROMPT_TEMPLATE, GENERAL_DISCLAIMER,
    GENNEXT_QA_SYSTEM_PROMPT, GENNEXT_QA_USER_PROMPT_TEMPLATE,
    GENNEXT_DOC_CONTEXT_NOTE, GENNEXT_INVOICE_SYSTEM_ADDENDUM,
    QUERY_ENHANCEMENT_PROMPT, CONTEXTUAL_QUERY_REWRITE_PROMPT,
)
from content_filter import get_content_filter
from query_logger import get_query_logger
from ragas_evaluator import get_ragas_evaluator
from providers.base import EmbeddingProvider, GenerationProvider

try:
    import faiss
    import numpy as np
except ImportError:
    faiss = None
    np = None


class TaxRAGEngine:
    """Retrieve-Augment-Generate for tax Q&A (provider-agnostic)"""

    def __init__(
        self,
        embedding_provider: EmbeddingProvider,
        generation_provider: GenerationProvider,
        index_dir: Optional[Path] = None,
    ):
        self.embedding_provider = embedding_provider
        self.generation_provider = generation_provider
        self.index_dir = index_dir or FAISS_INDEX_DIR
        self.index = None
        self.chunks = []
        self._query_enhancement_cache = {}
        self.bm25 = None
        self.parents = {}
        self.section_mapping = {}
        self._load_index()
        self._load_bm25()
        self._load_parents()
        self._load_section_mapping()

    def _load_index(self):
        """Load FAISS index and chunks metadata"""
        index_path = self.index_dir / "index.faiss"
        chunks_path = self.index_dir / "chunks.json"

        if not index_path.exists() or not chunks_path.exists():
            return None

        try:
            if faiss:
                self.index = faiss.read_index(str(index_path))
            with open(chunks_path, encoding="utf-8-sig") as f:
                self.chunks = json.load(f)
            return self.index
        except Exception as e:
            print(f"[WARN] Could not load FAISS index: {e}")
            return None

    def _embed_query(self, query: str) -> list:
        """Embed query using configured embedding provider"""
        if not self.embedding_provider:
            return None

        try:
            embeddings = self.embedding_provider.embed_texts([query])
            embedding = embeddings[0]
            return np.array([embedding], dtype=np.float32)
        except Exception as e:
            print(f"[ERROR] Failed to embed query: {e}")
            return None

    def _detect_old_section(self, query: str) -> str:
        """Detect old section references in query (e.g., 'Section 80C')"""
        # Match patterns like "Section 80C", "80D", "143(1)", etc.
        match = re.search(r"(?:Section\s+)?(\d+[A-Z]*(?:\(\d+\))?)", query, re.IGNORECASE)
        return match.group(1) if match else None

    def _load_bm25(self):
        """Load BM25 index and corpus from disk"""
        try:
            bm25_path = self.index_dir / "bm25_index.pkl"
            if bm25_path.exists() and BM25Okapi is not None:
                with open(bm25_path, "rb") as f:
                    self.bm25 = pickle.load(f)
        except Exception as e:
            print(f"[WARN] Could not load BM25 index: {e}")

    def _load_parents(self):
        """Load parent chunks from disk"""
        try:
            parents_path = self.index_dir / "parents.json"
            if parents_path.exists():
                with open(parents_path, encoding="utf-8-sig") as f:
                    self.parents = json.load(f)
        except Exception as e:
            print(f"[WARN] Could not load parent chunks: {e}")

    def _load_section_mapping(self):
        """Load old→new section mapping from JSON"""
        try:
            from config import SECTION_MAPPING_PATH
            if SECTION_MAPPING_PATH.exists():
                with open(SECTION_MAPPING_PATH, encoding="utf-8-sig") as f:
                    self.section_mapping = json.load(f)
        except Exception as e:
            print(f"[WARN] Could not load section mapping: {e}")

    def _resolve_old_section(self, query: str) -> tuple:
        """
        Detect old 1961 Act section refs (e.g. '80C', '143(1)') in query.
        Returns (augmented_query, mapping_context_str).
        augmented_query adds new section numbers for better retrieval.
        mapping_context_str is a ready-to-inject paragraph for the prompt.
        """
        old_to_new = self.section_mapping.get("old_to_new", {})
        if not old_to_new:
            return query, ""

        # Find old section numbers mentioned (80C, 80D, 143, 10, etc.)
        found = re.findall(r'\b(\d{1,3}[A-Z]{0,2})\b', query.upper())
        mapping_lines = []
        extra_terms = []

        for token in dict.fromkeys(found):  # deduplicate, preserve order
            mapping = old_to_new.get(token)
            if not mapping:
                continue
            new_sections = mapping.get("new_sections") or [mapping.get("new_section", "")]
            new_sections = [s for s in new_sections if s]
            title_old = mapping.get("title_old", "")
            title_new = mapping.get("title_new", "")
            summary = mapping.get("change_summary", "")

            new_refs = ", ".join(f"Section {s}" for s in new_sections)
            line = f"Section {token} of the Income Tax Act, 1961 ({title_old}) → {new_refs} of the Income Tax Act, 2025 ({title_new})."
            if summary:
                line += f" {summary}"
            mapping_lines.append(line)
            extra_terms += [f"Section {s}" for s in new_sections]
            extra_terms.append(title_new)

        if not mapping_lines:
            return query, ""

        augmented = query + " " + " ".join(extra_terms)
        context_str = "SECTION MAPPING (1961 Act → 2025 Act):\n" + "\n".join(f"- {l}" for l in mapping_lines)
        return augmented.strip(), context_str

    def _contextualize_query(self, question: str, chat_history: list) -> str:
        """Rewrite a follow-up question as a standalone query using chat history.
        Used only for GenNext retrieval — generation still uses the original question + full history."""
        if not chat_history:
            return question

        # Build compact history string
        lines = []
        for turn in chat_history[-CHAT_HISTORY_CONTEXT:]:
            if "role" in turn:
                lines.append(f"{turn['role'].capitalize()}: {turn.get('content', '')[:300]}")
            else:
                lines.append(f"User: {turn.get('question', '')[:200]}")
                lines.append(f"Assistant: {turn.get('answer', '')[:300]}")
        history_text = "\n".join(lines)

        cache_key = f"ctx:{hash(history_text[:200] + question)}"
        if cache_key in self._query_enhancement_cache:
            return self._query_enhancement_cache[cache_key]

        try:
            prompt = CONTEXTUAL_QUERY_REWRITE_PROMPT.format(history=history_text, question=question)
            rewritten = self.generation_provider.generate(prompt=prompt).strip()
            if not rewritten or len(rewritten) > 500:
                return question
            self._query_enhancement_cache[cache_key] = rewritten
            return rewritten
        except Exception:
            return question

    def _enhance_query(self, query: str) -> str:
        """
        Enhance query using LLM expansion (HyDE-lite) with caching.
        Returns expanded query for better retrieval.
        """
        if query in self._query_enhancement_cache:
            return self._query_enhancement_cache[query]

        try:
            from prompts import QUERY_ENHANCEMENT_PROMPT
            enhancement_prompt = QUERY_ENHANCEMENT_PROMPT.format(query=query)
            enhanced = self.generation_provider.generate(prompt=enhancement_prompt)
            enhanced = enhanced.strip()
            self._query_enhancement_cache[query] = enhanced
            return enhanced
        except Exception:
            # Fallback to original query on error
            return query

    def _bm25_search(self, query: str, top_k: int = BM25_TOP_K) -> list:
        """Search using BM25 keyword matching"""
        if not self.bm25 or not self.chunks:
            return []

        try:
            tokens = query.lower().split()
            scores = self.bm25.get_scores(tokens)
            top_indices = np.argsort(scores)[-top_k:][::-1]

            results = []
            for idx in top_indices:
                if scores[idx] > 0 and idx < len(self.chunks):
                    results.append(self.chunks[int(idx)])
            return results
        except Exception:
            return []

    def _rrf_merge(self, semantic_chunks: list, bm25_chunks: list, k: int = 60) -> list:
        """
        Reciprocal Rank Fusion: merge semantic and BM25 results.
        Returns merged list ranked by RRF score.
        """
        scores = {}

        # Score from semantic search
        for rank, chunk in enumerate(semantic_chunks):
            chunk_id = chunk.get("id")
            if chunk_id:
                scores[chunk_id] = scores.get(chunk_id, 0) + 1 / (k + rank + 1)

        # Score from BM25
        for rank, chunk in enumerate(bm25_chunks):
            chunk_id = chunk.get("id")
            if chunk_id:
                scores[chunk_id] = scores.get(chunk_id, 0) + 1 / (k + rank + 1)

        # Sort by RRF score and return chunks
        merged_ids = sorted(scores.keys(), key=lambda cid: scores[cid], reverse=True)

        # Create lookup dict from chunks
        chunk_map = {c.get("id"): c for c in semantic_chunks + bm25_chunks}
        merged_chunks = [chunk_map[cid] for cid in merged_ids if cid in chunk_map]

        return merged_chunks[:HYBRID_MERGE_TOP_K]

    def _expand_to_parents(self, chunks: list) -> list:
        """
        Replace child chunks with their parent chunks for richer context.
        Maintains order and deduplicates by parent_id.
        """
        seen_parents = set()
        expanded = []

        for chunk in chunks:
            parent_id = chunk.get("parent_id")
            if parent_id and parent_id in self.parents and parent_id not in seen_parents:
                parent = self.parents[parent_id]
                expanded.append(parent)
                seen_parents.add(parent_id)
            elif not parent_id:
                # No parent, keep the chunk itself
                expanded.append(chunk)

        return expanded

    def _rerank(self, question: str, chunks: list, top_k: int = RERANK_TOP_K) -> list:
        """
        Lightweight keyword re-ranking — no LLM calls.
        Boosts chunks whose text/source contains query keywords.
        """
        if not chunks:
            return []
        if len(chunks) <= top_k:
            return chunks

        # Tokenise query; skip very short stop-words
        stopwords = {"what", "was", "is", "are", "the", "a", "an", "of", "in",
                     "to", "and", "or", "for", "with", "about", "tell", "me",
                     "how", "does", "do", "did", "which", "who", "under"}
        query_words = [w for w in question.lower().split() if w not in stopwords and len(w) > 2]

        scored = []
        for chunk in chunks:
            text = chunk.get("text", "").lower()
            source = chunk.get("source", "").lower()
            section = str(chunk.get("section_number", "")).lower()

            score = 0
            for word in query_words:
                if word in text:
                    score += 1
                if word in source:
                    score += 3   # source/heading match is a strong signal
                if word in section:
                    score += 5   # exact section match is strongest
            scored.append((chunk, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [c for c, _ in scored[:top_k]]

    def retrieve(self, query: str, top_k: int = RETRIEVAL_TOP_K) -> list:
        """
        Advanced hybrid retrieval pipeline:
        0. Section mapping resolution (old 1961 refs → new 2025 section numbers)
        1. Query enhancement (LLM expansion, cached)
        2. Parallel semantic (FAISS) + BM25 search
        3. Reciprocal Rank Fusion merge
        4. Parent chunk expansion
        5. Keyword re-ranking (fast, no extra LLM call)
        """
        if not self.index or not self.chunks:
            return []

        try:
            # Step 0: Resolve old section refs to new section numbers
            augmented_query, _ = self._resolve_old_section(query)

            # Step 1: Enhance query for better retrieval (with fallback to augmented)
            enhanced_query = augmented_query
            try:
                enhanced_query = self._enhance_query(augmented_query)
            except Exception:
                pass  # Use augmented query on enhancement failure

            # Step 2: Semantic search via FAISS
            semantic_chunks = []
            try:
                query_embedding = self._embed_query(enhanced_query)
                if query_embedding is not None:
                    query_embedding = query_embedding / (np.linalg.norm(query_embedding) + 1e-8)
                    distances, indices = self.index.search(query_embedding, min(BM25_TOP_K, len(self.chunks)))
                    for idx in indices[0]:
                        if idx < len(self.chunks):
                            semantic_chunks.append(self.chunks[int(idx)])
            except Exception:
                pass

            # Step 3: BM25 keyword search
            bm25_chunks = self._bm25_search(enhanced_query, top_k=BM25_TOP_K)

            # Step 4: Reciprocal Rank Fusion merge
            merged_chunks = semantic_chunks  # Fallback to semantic if no BM25
            if bm25_chunks:
                merged_chunks = self._rrf_merge(semantic_chunks, bm25_chunks)

            if not merged_chunks:
                return []

            # Step 5: Expand child chunks to parents (richer context)
            expanded_chunks = self._expand_to_parents(merged_chunks)

            # Step 6: LLM re-ranking for relevance
            reranked_chunks = self._rerank(query, expanded_chunks, top_k=top_k)

            # Final deduplication by section
            results = []
            seen_sections = set()
            for chunk in reranked_chunks:
                section = chunk.get("section_number")
                if section not in seen_sections:
                    results.append(chunk)
                    seen_sections.add(section)

            return results[:top_k]

        except Exception as e:
            # Fallback to simple semantic search on any error
            try:
                query_embedding = self._embed_query(query)
                if query_embedding is None:
                    return []
                query_embedding = query_embedding / (np.linalg.norm(query_embedding) + 1e-8)
                distances, indices = self.index.search(query_embedding, min(top_k, len(self.chunks)))
                results = []
                seen_sections = set()
                for idx in indices[0]:
                    if idx < len(self.chunks):
                        chunk = self.chunks[int(idx)]
                        if chunk.get("section_number") not in seen_sections:
                            results.append(chunk)
                            seen_sections.add(chunk.get("section_number"))
                return results[:top_k]
            except Exception:
                return []

    def answer(
        self, question: str, chat_history: list = None, language: str = "English"
    ) -> dict:
        """Generate answer using RAG pipeline with logging and evaluation"""
        # Generate unique ID for this query
        query_id = str(uuid.uuid4())[:8]
        logger = get_query_logger()
        evaluator = get_ragas_evaluator()
        start_time = time.time()

        if not self.embedding_provider or not self.generation_provider:
            return {
                "answer": "LLM providers not configured. Please configure an AI provider.",
                "error": True,
                "sources": [],
            }

        # Log incoming query
        logger.log_query(
            query_id=query_id,
            feature="rag_qa",
            question=question,
            is_tax_related=None,  # Will update after filter check
            relevance_score=0.0,
            language=language,
        )

        # Content filtering: Check if question is tax-related
        content_filter = get_content_filter()
        is_tax_related, relevance_score, reason = content_filter.is_tax_related(question)

        # Log filter decision
        logger.log_filter_decision(query_id, question, is_tax_related, relevance_score, reason)

        if not is_tax_related:
            # Log the filter rejection
            logger.log_feature_output(
                query_id=query_id,
                feature="rag_qa",
                output={"filtered": True},
                processing_time_ms=(time.time() - start_time) * 1000,
                success=True,
            )
            return {
                "answer": content_filter.get_rejection_response(question),
                "error": False,
                "sources": [],
            }

        try:
            # Retrieve relevant chunks with timing
            retrieval_start = time.time()
            retrieved_chunks = self.retrieve(question, RETRIEVAL_TOP_K)
            retrieval_time = (time.time() - retrieval_start) * 1000

            # Log retrieval
            logger.log_retrieval(
                query_id=query_id,
                query=question,
                retrieved_chunks=retrieved_chunks,
                num_results=len(retrieved_chunks),
                retrieval_time_ms=retrieval_time,
            )

            if not retrieved_chunks:
                context = "[No specific sections retrieved — answer from your expert knowledge of the Income Tax Act, 2025]"
                sources = []
            else:
                # Format context — use top 5 chunks, 1000 chars each for richer context
                context = "\n\n".join(
                    [f"**{c['source']}**:\n{c['text'][:1000]}" for c in retrieved_chunks]
                )
                sources = [
                    {
                        "source": c["source"],
                        "section": c.get("section_number"),
                        "text": c.get("text", ""),
                    }
                    for c in retrieved_chunks
                ]

            # Format chat history — handles both {role/content} and {question/answer} formats
            history_text = ""
            if chat_history:
                # Pair up role/content messages into Q&A turns
                if chat_history and "role" in chat_history[0]:
                    pairs = []
                    i = 0
                    while i < len(chat_history) - 1:
                        if chat_history[i].get("role") == "user":
                            pairs.append((
                                chat_history[i].get("content", ""),
                                chat_history[i + 1].get("content", "") if chat_history[i + 1].get("role") == "assistant" else ""
                            ))
                            i += 2
                        else:
                            i += 1
                    for q, a in pairs[-CHAT_HISTORY_CONTEXT:]:
                        history_text += f"User: {q}\nAssistant: {a[:600]}\n\n"
                else:
                    for turn in chat_history[-CHAT_HISTORY_CONTEXT:]:
                        q = turn.get("question", "")
                        a = turn.get("answer", "")
                        history_text += f"User: {q}\nAssistant: {a[:600]}\n\n"

            # Build prompt
            user_prompt = TAX_QA_USER_PROMPT_TEMPLATE.format(
                question=question, context=context, chat_history=history_text
            )

            # Call generation provider with timing
            generation_start = time.time()
            answer_text = self.generation_provider.generate(
                prompt=user_prompt,
                system_prompt=TAX_QA_SYSTEM_PROMPT
            )
            generation_time = (time.time() - generation_start) * 1000

            answer_text = answer_text + GENERAL_DISCLAIMER

            # Log generation
            logger.log_generation(
                query_id=query_id,
                answer=answer_text,
                generation_time_ms=generation_time,
                model=GENERATION_MODEL,
            )

            # Log feature completion
            logger.log_feature_output(
                query_id=query_id,
                feature="rag_qa",
                output={"answer_length": len(answer_text), "sources": len(sources)},
                processing_time_ms=(time.time() - start_time) * 1000,
                success=True,
            )

            # Evaluate response quality (async in background, non-blocking)
            # Only evaluate a sample of responses to save on API calls
            import random
            if random.random() < 0.2:  # Evaluate 20% of responses
                try:
                    full_context = "\n\n".join([c.get("text", "") for c in retrieved_chunks[:3]])
                    evaluation = evaluator.evaluate_response(
                        query_id=query_id,
                        question=question,
                        retrieved_context=full_context,
                        generated_answer=answer_text,
                    )
                except Exception as e:
                    # Silently fail if evaluation fails - don't block user response
                    logger.log_error(query_id, "rag_qa", "evaluation_error", str(e))

            return {"answer": answer_text, "error": False, "sources": sources}

        except Exception as e:
            # Log error
            error_str = str(e)
            logger.log_error(
                query_id=query_id,
                feature="rag_qa",
                error_type=type(e).__name__,
                error_message=error_str,
            )

            # Provide user-friendly error messages
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
                user_message = """**API Quota Exceeded**

Your Gemini API free tier quota has been exhausted. You have 3 options:

1. **Upgrade to Gemini Paid Tier** (Recommended)
   - Visit: https://console.cloud.google.com/billing
   - Add payment method - only ~$0.10 per 1M tokens
   - Quota resets with ~50x higher limits

2. **Wait for Quota Reset**
   - Free tier quota resets in ~24 hours

3. **Use Different LLM Provider**
   - Switch to Claude/OpenAI in .env (see README)

**In the meantime**, use the offline features which work perfectly:
- **Tab 2**: Section Mapper (103 mappings)
- **Tab 3**: Profile Analyzer (5 profiles)
- **Tab 4**: Notice Decoder (regex-based)
"""
            else:
                user_message = f"Error generating answer: {error_str}. Please try again."

            return {
                "answer": user_message,
                "error": True,
                "sources": [],
            }

    # ── GenNext methods ───────────────────────────────────────────────────────

    def _retrieve_with_scores(self, query: str, top_k: int = RETRIEVAL_TOP_K) -> list:
        """Like retrieve() but returns [(chunk, cosine_score), ...] pairs"""
        if not self.index or not self.chunks:
            return []

        query_embedding = self._embed_query(query)
        if query_embedding is None:
            return []

        query_embedding = query_embedding / (np.linalg.norm(query_embedding) + 1e-8)
        distances, indices = self.index.search(query_embedding, min(top_k, len(self.chunks)))

        results = []
        seen_sections = set()
        for score, idx in zip(distances[0], indices[0]):
            if idx < len(self.chunks):
                chunk = self.chunks[int(idx)]
                if chunk.get("section_number") not in seen_sections:
                    results.append((chunk, float(score)))
                    seen_sections.add(chunk.get("section_number"))

        return results[:top_k]

    def _build_gennext_prompt(
        self,
        question: str,
        chat_history: list,
        doc_context: Optional[str],
        is_invoice: bool,
    ) -> tuple:
        """Build system + user prompt for GenNext. Returns (system_prompt, user_prompt, sources, low_confidence)."""
        # Rewrite follow-up questions as standalone queries for better retrieval
        retrieval_query = self._contextualize_query(question, chat_history)

        # Resolve old section mapping first — this is a fast offline lookup
        _, mapping_context = self._resolve_old_section(retrieval_query)

        # Retrieve 2x candidates then boost 2025 Act / 2026 Rules sources to the front
        _preferred_sources = {
            "income_tax_act_2025_as_amended_by_fa_act_2026.pdf",
            "income-tax-rules-2026.pdf",
            "updated-fqas-on-interplay&transitions.pdf",
        }
        all_candidates = self.retrieve(retrieval_query, RETRIEVAL_TOP_K * 2)
        preferred = [c for c in all_candidates if c.get("source_file", "").lower() in _preferred_sources]
        others    = [c for c in all_candidates if c.get("source_file", "").lower() not in _preferred_sources]
        # Fill slots: as many preferred as available, topped up with others
        chunks = (preferred + others)[:RETRIEVAL_TOP_K]

        low_confidence = False
        if not chunks:
            act_context = "[No matching sections found in the Income Tax Act, 2025 index.]"
            sources = []
            low_confidence = True
        else:
            act_context = "\n\n".join(
                [f"**{c['source']}**:\n{c.get('text', '')[:1200]}" for c in chunks]
            )
            sources = [
                {"source": c["source"], "section": c.get("section_number"), "text": c.get("text", "")}
                for c in chunks
            ]

        # Prepend section mapping context if found — lets the LLM explain old→new
        if mapping_context:
            context = mapping_context + "\n\n" + act_context
            low_confidence = False  # mapping found means we can answer with confidence
        else:
            context = act_context

        # Format chat history
        history_text = ""
        if chat_history:
            if chat_history and "role" in chat_history[0]:
                pairs = []
                i = 0
                while i < len(chat_history) - 1:
                    if chat_history[i].get("role") == "user":
                        pairs.append((
                            chat_history[i].get("content", ""),
                            chat_history[i + 1].get("content", "") if chat_history[i + 1].get("role") == "assistant" else ""
                        ))
                        i += 2
                    else:
                        i += 1
                for q, a in pairs[-CHAT_HISTORY_CONTEXT:]:
                    history_text += f"User: {q}\nAssistant: {a[:600]}\n\n"
            else:
                for turn in chat_history[-CHAT_HISTORY_CONTEXT:]:
                    history_text += f"User: {turn.get('question', '')}\nAssistant: {turn.get('answer', '')[:600]}\n\n"

        # Build doc context section
        doc_context_section = ""
        if doc_context and doc_context.strip():
            doc_context_section = (
                "USER'S DOCUMENT (reference specific figures from this document in your answer):\n"
                f"{doc_context.strip()}\n\n"
            )

        # Build system prompt
        system_prompt = GENNEXT_QA_SYSTEM_PROMPT
        if doc_context and doc_context.strip():
            system_prompt = system_prompt + "\n\n" + GENNEXT_DOC_CONTEXT_NOTE
        if is_invoice:
            system_prompt = system_prompt + "\n\n" + GENNEXT_INVOICE_SYSTEM_ADDENDUM

        user_prompt = GENNEXT_QA_USER_PROMPT_TEMPLATE.format(
            context=context,
            doc_context_section=doc_context_section,
            chat_history=history_text,
            question=question,
        )

        return system_prompt, user_prompt, sources, low_confidence

    def answer_gennext(
        self,
        question: str,
        chat_history: list = None,
        language: str = "English",
        doc_context: Optional[str] = None,
        is_invoice: bool = False,
    ) -> dict:
        """Grounded answer for GenNext — strict context + confidence threshold.
        Original answer() is not modified."""
        if not self.embedding_provider or not self.generation_provider:
            return {
                "answer": "LLM providers not configured. Please configure an AI provider.",
                "error": True,
                "sources": [],
            }

        # Skip content filter for follow-ups (chat_history present) and invoice mode
        if not is_invoice and not chat_history:
            content_filter = get_content_filter()
            is_tax_related, _, _ = content_filter.is_tax_related(question)
            if not is_tax_related:
                return {
                    "answer": content_filter.get_rejection_response(question),
                    "error": False,
                    "sources": [],
                }

        try:
            system_prompt, user_prompt, sources, _ = self._build_gennext_prompt(
                question, chat_history or [], doc_context, is_invoice
            )
            answer_text = self.generation_provider.generate(
                prompt=user_prompt,
                system_prompt=system_prompt,
            )
            return {"answer": answer_text + GENERAL_DISCLAIMER, "error": False, "sources": sources}
        except Exception as e:
            return {"answer": f"Error generating answer: {e}", "error": True, "sources": []}

    def answer_gennext_stream(
        self,
        question: str,
        chat_history: list = None,
        language: str = "English",
        doc_context: Optional[str] = None,
        is_invoice: bool = False,
    ):
        """Streaming GenNext answer. Yields {"chunk": str} then {"sources": [...], "done": True}."""
        if not self.embedding_provider or not self.generation_provider:
            yield {"chunk": "LLM providers not configured. Please configure an AI provider."}
            yield {"sources": [], "done": True}
            return

        # Skip content filter for follow-ups — if chat_history exists the conversation
        # is already established as tax-related; short follow-ups ("and for NRIs?") would
        # otherwise be incorrectly rejected before contextualization runs.
        if not is_invoice and not chat_history:
            content_filter = get_content_filter()
            is_tax_related, _, _ = content_filter.is_tax_related(question)
            if not is_tax_related:
                yield {"chunk": content_filter.get_rejection_response(question)}
                yield {"sources": [], "done": True}
                return

        try:
            system_prompt, user_prompt, sources, _ = self._build_gennext_prompt(
                question, chat_history or [], doc_context, is_invoice
            )
            for text_chunk in self.generation_provider.stream_generate(
                prompt=user_prompt,
                system_prompt=system_prompt,
            ):
                yield {"chunk": text_chunk}
            yield {"chunk": GENERAL_DISCLAIMER}
            yield {"sources": sources, "done": True}
        except Exception as e:
            yield {"chunk": f"Error generating answer: {e}"}
            yield {"sources": [], "done": True}


def _read_index_dims(index_path: Path) -> int:
    """Return dimension of a FAISS index file, or 0 if unreadable."""
    if not index_path.exists():
        return 0
    try:
        if faiss:
            return faiss.read_index(str(index_path)).d
    except Exception:
        pass
    return 0


def get_rag_engine():
    """Create RAG engine with providers from environment.

    Index selection priority (first match wins):
    1. OpenAI key available + data/faiss_index/index.faiss (1536 dims) → OpenAI embeddings
    2. Gemini key available + data/faiss_index_gemini/index.faiss (3072 dims) → Gemini embeddings
    3. Fallback: auto-detect dims from whichever index exists

    Generation provider follows LLM_PROVIDER env var (any provider).
    """
    import os
    from providers import get_providers

    openai_key = os.getenv("OPENAI_API_KEY", "")
    gemini_key = os.getenv("GEMINI_API_KEY", "")

    openai_index_exists = (FAISS_INDEX_DIR / "index.faiss").exists()
    gemini_index_exists = (FAISS_INDEX_DIR_GEMINI / "index.faiss").exists()

    embedding_provider = None
    chosen_dir = FAISS_INDEX_DIR

    if openai_key and openai_index_exists:
        from providers.openai import OpenAIEmbeddingProvider
        embedding_provider = OpenAIEmbeddingProvider(openai_key)
        chosen_dir = FAISS_INDEX_DIR
    elif gemini_key and gemini_index_exists:
        from providers.gemini import GeminiEmbeddingProvider
        embedding_provider = GeminiEmbeddingProvider(gemini_key)
        chosen_dir = FAISS_INDEX_DIR_GEMINI
    else:
        # Fallback: auto-detect dims from whichever index exists
        for candidate_dir in [FAISS_INDEX_DIR, FAISS_INDEX_DIR_GEMINI]:
            dims = _read_index_dims(candidate_dir / "index.faiss")
            if dims == 1536 and openai_key:
                from providers.openai import OpenAIEmbeddingProvider
                embedding_provider = OpenAIEmbeddingProvider(openai_key)
                chosen_dir = candidate_dir
                break
            elif dims == 3072 and gemini_key:
                from providers.gemini import GeminiEmbeddingProvider
                embedding_provider = GeminiEmbeddingProvider(gemini_key)
                chosen_dir = candidate_dir
                break

    if embedding_provider is None:
        raise ValueError(
            "No usable embedding index found. Provide OPENAI_API_KEY (for data/faiss_index/) "
            "or GEMINI_API_KEY (for data/faiss_index_gemini/)."
        )

    _, generation_provider = get_providers()
    return TaxRAGEngine(embedding_provider, generation_provider, index_dir=chosen_dir)
