"""PDF Ingestion Pipeline: Extract, chunk, embed, and build FAISS index"""

import json
import pickle
import re
import time
import uuid
from pathlib import Path
from typing import List, Dict, Optional, Callable

try:
    import faiss
    import numpy as np
except ImportError:
    faiss = None
    np = None

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    BM25Okapi = None


MAX_CHUNK_SIZE = 1200  # Aggressive reduction — ~3-4x more chunks from same content
CHUNK_OVERLAP = 400    # High overlap for rich context
CHILD_CHUNK_SIZE = 400  # Child chunks for embedding (finer granularity)
CHILD_OVERLAP = 150     # Child chunk overlap
EMBEDDING_BATCH_SIZE = 20

# Regex to detect top-level section boundaries in the Income Tax Act
# Also matches bare-number format "202.  Income-tax payable..." used in the 2025 Act PDF
_SECTION_RE = re.compile(
    r"(?:^|\n)((?:Section|SECTION)\s+\d+[A-Z]*"
    r"|(?:CHAPTER|Chapter)\s+[IVXLCDM\d]+\b"
    r"|(?:SCHEDULE|Schedule)\s+[IVXLCDM\d]+\b"
    r"|\d{1,3}[A-Z]?\.(?=\s{1,4}\())",  # "202.  (1)..." only — requires sub-section paren, not table rows like "1. Upto"
    re.MULTILINE,
)
# Numbered sections: "1. Short title", "393. Deduction of tax at source"
_NUMBERED_SECTION_RE = re.compile(
    r"(?:^|\n)\s*(\d{1,3}[A-Z]?)\.\s{1,4}[A-Z][a-z]",
    re.MULTILINE,
)
# Sub-section boundary: "(1)", "(2)", "(2A)" etc.
_SUBSECTION_RE = re.compile(r"\n\s*\((\d+[A-Z]?)\)\s+", re.MULTILINE)


def _extract_section_number(text: str, filename: str) -> str:
    """Best-effort section/schedule number from filename or text."""
    # From filename: Section-123.pdf, Schedule-1.pdf
    m = re.search(r"(?:Section|Schedule)[- _](\d+[A-Z]*)", filename, re.IGNORECASE)
    if m:
        return m.group(1)
    # From first line of text — "Section 202" style
    m = re.search(r"(?:Section|SECTION)\s+(\d+[A-Z]*)", text[:400])
    if m:
        return m.group(1)
    # Bare-number format "202.  ..." used in 2025 Act PDF
    m = re.match(r"\s*(\d{1,3}[A-Z]?)\.", text.strip()[:20])
    if m:
        return m.group(1)
    return ""


def _extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract all text from a PDF using PyPDF2."""
    if PyPDF2 is None:
        raise ImportError("PyPDF2 is required. Run: pip install PyPDF2")
    text_parts = []
    with open(pdf_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            try:
                text_parts.append(page.extract_text() or "")
            except Exception:
                pass
    return "\n".join(text_parts)


def _chunk_section_text(
    text: str,
    source: str,
    source_file: str,
    section_number: str,
    chapter: str,
    max_size: int = MAX_CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> List[Dict]:
    """Split a single section's text into sub-chunks, respecting sub-section boundaries."""
    if len(text) <= max_size:
        return [{
            "id": str(uuid.uuid4()),
            "text": text.strip(),
            "source": source,
            "source_file": source_file,
            "section_number": section_number,
            "chapter": chapter,
            "chunk_index": 0,
            "total_chunks": 1,
            "parent_id": None,
        }]

    # Split at sub-section boundaries first
    splits = _SUBSECTION_RE.split(text)
    # splits alternates: [pre-text, sub_num, sub_text, sub_num, sub_text, ...]
    pieces = []
    if splits:
        pieces.append(splits[0])
        i = 1
        while i < len(splits) - 1:
            pieces.append(f"({splits[i]}) {splits[i + 1]}")
            i += 2

    # Merge pieces into chunks ≤ max_size with overlap
    chunks = []
    current = ""
    for piece in pieces:
        if not current:
            current = piece
        elif len(current) + len(piece) + 1 <= max_size:
            current += "\n" + piece
        else:
            chunks.append(current.strip())
            current = (current[-overlap:] if len(current) > overlap else current) + "\n" + piece

    if current.strip():
        chunks.append(current.strip())

    parent_id = str(uuid.uuid4())
    return [
        {
            "id": str(uuid.uuid4()),
            "text": c,
            "source": source,
            "source_file": source_file,
            "section_number": section_number,
            "chapter": chapter,
            "chunk_index": i,
            "total_chunks": len(chunks),
            "parent_id": parent_id,
        }
        for i, c in enumerate(chunks)
        if c
    ]


def _combine_section_patterns(text: str) -> List[tuple]:
    """Find all section boundaries in order using _SECTION_RE only.
    _NUMBERED_SECTION_RE is intentionally excluded — it false-positives on table rows
    like '1. Upto ₹400000' which would split tax-rate tables away from their parent section.
    """
    matches = []
    for m in _SECTION_RE.finditer(text):
        matches.append((m.start(), m.group(1), "header"))
    matches.sort(key=lambda x: x[0])
    return matches


def _chunk_large_document_v2(
    text: str,
    source_file: str,
    doc_label: str,
) -> tuple[List[Dict], Dict[str, Dict]]:
    """
    Chunk full-Act PDF with parent-child structure.
    Returns: (child_chunks_list, parents_dict)
    """
    child_chunks = []
    parents = {}
    current_chapter = ""

    # Find all section boundaries
    boundaries = _combine_section_patterns(text)

    if not boundaries:
        # Fallback: no sections found, treat entire document as one section
        parent_id = str(uuid.uuid4())
        parents[parent_id] = {
            "id": parent_id,
            "type": "parent",
            "text": text.strip(),
            "section_number": "",
            "chapter": "",
            "source": doc_label,
            "source_file": source_file,
            "char_count": len(text),
        }
        # Split parent into children
        children = _split_into_children(text, parent_id, "", "", doc_label, source_file)
        child_chunks.extend(children)
        return child_chunks, parents

    # Extract sections between boundaries
    sections = []
    for idx, (pos, heading, match_type) in enumerate(boundaries):
        # Body extends to next boundary or end of text
        end_pos = boundaries[idx + 1][0] if idx + 1 < len(boundaries) else len(text)
        body = text[pos:end_pos].strip()
        sections.append((heading, body, match_type))

    # Also add preamble if there's text before first boundary
    if boundaries and boundaries[0][0] > 0:
        preamble = text[:boundaries[0][0]].strip()
        if preamble:
            sections.insert(0, ("Preamble", preamble, "preamble"))

    # Process each section
    for heading, body, match_type in sections:
        # Update current chapter
        if "CHAPTER" in heading.upper():
            current_chapter = heading

        section_number = _extract_section_number(body or heading, source_file)
        source = f"{doc_label} › {heading}" if heading else doc_label

        full_text = f"{heading}\n{body}" if body else heading

        # Create parent chunk
        parent_id = str(uuid.uuid4())
        parents[parent_id] = {
            "id": parent_id,
            "type": "parent",
            "text": full_text.strip(),
            "section_number": section_number,
            "chapter": current_chapter,
            "source": source,
            "source_file": source_file,
            "char_count": len(full_text),
        }

        # Split parent into children for embedding
        children = _split_into_children(
            full_text,
            parent_id,
            section_number,
            current_chapter,
            source,
            source_file,
        )
        child_chunks.extend(children)

    return child_chunks, parents


def _split_into_children(
    text: str,
    parent_id: str,
    section_number: str,
    chapter: str,
    source: str,
    source_file: str,
) -> List[Dict]:
    """Split a parent chunk into child chunks for embedding."""
    if len(text) <= CHILD_CHUNK_SIZE:
        return [{
            "id": str(uuid.uuid4()),
            "type": "child",
            "text": text.strip(),
            "parent_id": parent_id,
            "source": source,
            "source_file": source_file,
            "section_number": section_number,
            "chapter": chapter,
            "chunk_index": 0,
            "total_chunks": 1,
        }]

    # Split at subsection boundaries first
    splits = _SUBSECTION_RE.split(text)
    pieces = []
    if splits:
        pieces.append(splits[0])
        i = 1
        while i < len(splits) - 1:
            pieces.append(f"({splits[i]}) {splits[i + 1]}")
            i += 2

    # Merge pieces into children ≤ CHILD_CHUNK_SIZE with CHILD_OVERLAP
    children_text = []
    current = ""
    for piece in pieces:
        if not current:
            current = piece
        elif len(current) + len(piece) + 1 <= CHILD_CHUNK_SIZE:
            current += "\n" + piece
        else:
            if current.strip():
                children_text.append(current.strip())
            overlap_text = current[-CHILD_OVERLAP:] if len(current) > CHILD_OVERLAP else current
            current = overlap_text + "\n" + piece

    if current.strip():
        children_text.append(current.strip())

    return [
        {
            "id": str(uuid.uuid4()),
            "type": "child",
            "text": ct,
            "parent_id": parent_id,
            "source": source,
            "source_file": source_file,
            "section_number": section_number,
            "chapter": chapter,
            "chunk_index": i,
            "total_chunks": len(children_text),
        }
        for i, ct in enumerate(children_text)
    ]


def _chunk_large_document(
    text: str,
    source_file: str,
    doc_label: str,
    max_size: int = MAX_CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> List[Dict]:
    """Chunk a full-Act or Rules PDF by detecting section/chapter boundaries."""
    chunks = []
    current_chapter = ""

    # Split into sections
    parts = _SECTION_RE.split(text)
    # parts[0] is preamble/intro, then alternates: [heading, body, heading, body ...]

    sections = []
    if parts:
        preamble = parts[0].strip()
        if preamble:
            sections.append(("Preamble", "", preamble))
        i = 1
        while i < len(parts) - 1:
            heading = parts[i].strip()
            body = parts[i + 1].strip() if i + 1 < len(parts) else ""
            sections.append((heading, "", heading + "\n" + body))
            i += 2

    for heading, _, full_text in sections:
        # Update current chapter
        if re.match(r"CHAPTER|Chapter", heading):
            current_chapter = heading

        section_number = _extract_section_number(full_text, source_file)
        source = f"{doc_label} › {heading}" if heading else doc_label

        sub_chunks = _chunk_section_text(
            full_text,
            source=source,
            source_file=source_file,
            section_number=section_number,
            chapter=current_chapter,
            max_size=max_size,
            overlap=overlap,
        )
        chunks.extend(sub_chunks)

    return chunks


def _chunks_from_pdf(pdf_path: Path) -> tuple[List[Dict], Dict[str, Dict]]:
    """
    Extract and chunk a single PDF file.
    Returns: (child_chunks_list, parents_dict)
    """
    filename = pdf_path.name
    rel_path = pdf_path.name
    parents = {}

    # Individual section/schedule PDFs (short, use entire text as 1-2 chunks)
    is_section_pdf = bool(re.match(r"(Section|Schedule)[- _]\d+", filename, re.IGNORECASE))

    text = _extract_text_from_pdf(pdf_path)
    if not text.strip():
        return [], {}

    if is_section_pdf:
        section_number = _extract_section_number(text, filename)
        chunks = _chunk_section_text(
            text,
            source=f"Income Tax Act 2025 › {filename.replace('.pdf', '')}",
            source_file=rel_path,
            section_number=section_number,
            chapter="",
        )
        return chunks, parents
    else:
        # Map known filenames to friendly labels
        label_map = {
            "Income_Tax_Act_2025_as_amended_by_FA_Act_2026.pdf": "Income Tax Act 2025 (amended)",
            "The_Income-tax_Bill,_2025.pdf": "Income Tax Bill 2025",
            "Income Tax Rules 2026.pdf": "Income Tax Rules 2026",
            "Finance Bill 2026.pdf": "Finance Bill 2026",
        }
        label = label_map.get(filename, filename.replace(".pdf", ""))
        chunks, parents = _chunk_large_document_v2(text, source_file=rel_path, doc_label=label)
        return chunks, parents


def _normalise(vec):
    """L2-normalise a numpy vector in-place."""
    norm = np.linalg.norm(vec) + 1e-8
    vec /= norm
    return vec


class PDFIngestionPipeline:
    """Build a FAISS index from PDFs in pdf_dir."""

    def __init__(
        self,
        pdf_dir: Optional[Path] = None,
        output_dir: Optional[Path] = None,
        embedding_provider=None,
        progress_callback: Optional[Callable[[str, float], None]] = None,
    ):
        from config import PDF_DIR, FAISS_INDEX_DIR
        self.pdf_dir = pdf_dir or PDF_DIR
        self.output_dir = output_dir or FAISS_INDEX_DIR
        self.embedding_provider = embedding_provider
        self._cb = progress_callback or (lambda msg, pct: print(f"[{pct:5.1f}%] {msg}"))

    def _log(self, msg: str, pct: float = 0.0):
        self._cb(msg, pct)

    def _embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed a batch of texts with exponential backoff and strict length validation."""
        max_retries = 3
        backoff = 2
        for attempt in range(max_retries):
            try:
                # Use a safe truncation based on a conservative token estimation.
                # Since we've set MAX_CHUNK_SIZE to 5000, we truncate to 15k chars
                # to be absolutely safe for any provider.
                safe_texts = [t[:15000] if len(t) > 15000 else t for t in texts]
                return self.embedding_provider.embed_batch(safe_texts)
            except Exception as e:
                err = str(e)
                if "401" in err or "403" in err or "INVALID" in err:
                    raise
                if attempt < max_retries - 1 and ("429" in err or "rate" in err.lower() or "quota" in err.lower()):
                    self._log(f"Rate-limited, retrying in {backoff}s…", 0)
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 60)
                else:
                    raise

    def ingest(self) -> dict:
        """Run the full ingestion pipeline. Returns summary dict."""
        if faiss is None or np is None:
            raise ImportError("faiss-cpu and numpy are required. Run: pip install faiss-cpu numpy")
        if PyPDF2 is None:
            raise ImportError("PyPDF2 is required. Run: pip install PyPDF2")
        if self.embedding_provider is None:
            raise ValueError("embedding_provider is required to run ingestion")

        self.output_dir.mkdir(parents=True, exist_ok=True)
        checkpoint_path = self.output_dir / "checkpoint.json"

        # Find PDFs — section PDFs first (they win over full-Act in dedup)
        all_pdfs = sorted(self.pdf_dir.rglob("*.pdf"))
        if not all_pdfs:
            raise FileNotFoundError(
                f"No PDF files found in {self.pdf_dir}. "
                "Place your Income Tax Act PDFs there and retry."
            )

        self._log(f"Found {len(all_pdfs)} PDF(s). Extracting text & chunking…", 2)

        # Load checkpoint to support resume
        processed_files: set = set()
        all_chunks: List[Dict] = []
        all_parents: Dict[str, Dict] = {}
        if checkpoint_path.exists():
            try:
                cp = json.loads(checkpoint_path.read_text())
                processed_files = set(cp.get("processed_files", []))
                # Reload already-chunked data
                chunks_path = self.output_dir / "chunks.json"
                if chunks_path.exists():
                    existing = json.loads(chunks_path.read_text())
                    if existing:
                        all_chunks = existing
                        self._log(f"Resuming from checkpoint ({len(all_chunks)} chunks already saved)", 5)
                # Reload already-extracted parents
                parents_path = self.output_dir / "parents.json"
                if parents_path.exists():
                    try:
                        all_parents = json.loads(parents_path.read_text())
                    except Exception:
                        pass
            except Exception:
                pass

        # --- Phase 1: Extract & chunk ---
        section_pdf_sections: set = set()  # section numbers from individual section PDFs

        for i, pdf_path in enumerate(all_pdfs):
            fname = pdf_path.name
            if fname in processed_files:
                continue

            pct = 5 + (i / len(all_pdfs)) * 40
            self._log(f"Chunking {fname}…", pct)

            try:
                new_chunks, new_parents = _chunks_from_pdf(pdf_path)
            except Exception as e:
                self._log(f"[WARN] Skipping {fname}: {e}", pct)
                continue

            if not new_chunks:
                processed_files.add(fname)
                continue

            # Track section numbers from individual section PDFs for dedup
            is_section_pdf = bool(re.match(r"(Section|Schedule)[- _]\d+", fname, re.IGNORECASE))
            if is_section_pdf:
                for c in new_chunks:
                    if c.get("section_number"):
                        section_pdf_sections.add(c["section_number"])

            # Dedup: skip full-Act chunks whose section already covered by individual PDF
            if not is_section_pdf:
                new_chunks = [
                    c for c in new_chunks
                    if not c.get("section_number") or c["section_number"] not in section_pdf_sections
                ]

            all_chunks.extend(new_chunks)
            all_parents.update(new_parents)
            processed_files.add(fname)

        self._log(f"Chunking complete. {len(all_chunks)} chunks total. Generating embeddings…", 46)

        if not all_chunks:
            raise ValueError("No text chunks extracted. Check that PDFs are text-based (not scanned images).")

        # --- Phase 2: Embed ---
        dim = self.embedding_provider.get_embedding_dimension()
        all_embeddings = []

        # Check if we already have embeddings saved
        emb_path = self.output_dir / "embeddings_cache.npy"
        if emb_path.exists():
            try:
                cached = np.load(str(emb_path))
                if cached.shape[0] == len(all_chunks) and cached.shape[1] == dim:
                    all_embeddings = list(cached)
                    self._log(f"Loaded {len(all_embeddings)} cached embeddings.", 50)
            except Exception:
                pass

        if len(all_embeddings) != len(all_chunks):
            all_embeddings = []
            texts = [c["text"] for c in all_chunks]
            total_batches = (len(texts) + EMBEDDING_BATCH_SIZE - 1) // EMBEDDING_BATCH_SIZE

            for b_idx in range(0, len(texts), EMBEDDING_BATCH_SIZE):
                batch = texts[b_idx: b_idx + EMBEDDING_BATCH_SIZE]
                batch_num = b_idx // EMBEDDING_BATCH_SIZE + 1
                pct = 46 + (batch_num / total_batches) * 44
                self._log(f"Embedding batch {batch_num}/{total_batches}…", pct)

                vecs = self._embed_batch(batch)
                all_embeddings.extend(vecs)

                # Save cache periodically
                if batch_num % 10 == 0:
                    np.save(str(emb_path), np.array(all_embeddings, dtype=np.float32))

            np.save(str(emb_path), np.array(all_embeddings, dtype=np.float32))
            self._log(f"Embeddings complete. Building FAISS index…", 91)

        # --- Phase 3: Build FAISS index ---
        matrix = np.array(all_embeddings, dtype=np.float32)
        # L2-normalise for cosine similarity via inner product
        norms = np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-8
        matrix /= norms

        index = faiss.IndexFlatIP(dim)
        index.add(matrix)

        # --- Phase 3b: Build BM25 index ---
        self._log("Building BM25 index…", 94)
        if BM25Okapi is not None:
            try:
                # Tokenize all child chunk texts
                chunk_texts = [c["text"] for c in all_chunks]
                tokenized_corpus = [text.lower().split() for text in chunk_texts]
                bm25 = BM25Okapi(tokenized_corpus)

                # Save BM25 index
                bm25_path = self.output_dir / "bm25_index.pkl"
                with open(bm25_path, "wb") as f:
                    pickle.dump(bm25, f)

                # Save corpus mapping (chunk id → tokens) for future queries
                corpus_path = self.output_dir / "bm25_corpus.json"
                corpus_data = {
                    c["id"]: tokenized_corpus[i]
                    for i, c in enumerate(all_chunks)
                }
                with open(corpus_path, "w", encoding="utf-8") as f:
                    json.dump(corpus_data, f, ensure_ascii=False)

                self._log("BM25 index built and saved.", 96)
            except Exception as e:
                self._log(f"[WARN] BM25 building failed: {e}. Continuing without BM25.", 96)

        # --- Phase 4: Save ---
        faiss.write_index(index, str(self.output_dir / "index.faiss"))
        with open(self.output_dir / "chunks.json", "w", encoding="utf-8") as f:
            json.dump(all_chunks, f, ensure_ascii=False)

        # Save parents
        if all_parents:
            with open(self.output_dir / "parents.json", "w", encoding="utf-8") as f:
                json.dump(all_parents, f, ensure_ascii=False)

        checkpoint_path.write_text(json.dumps({
            "status": "complete",
            "total_chunks": len(all_chunks),
            "total_parents": len(all_parents),
            "processed_files": sorted(processed_files),
        }))

        self._log(f"Done! {len(all_chunks)} chunks indexed ({index.ntotal} vectors). {len(all_parents)} parent chunks saved.", 100)
        return {"status": "success", "chunks_count": len(all_chunks), "parents_count": len(all_parents), "vectors": index.ntotal}

    # Alias used by the ingestion API router
    def run(self):
        return self.ingest()


if __name__ == "__main__":
    import os, sys
    sys.path.insert(0, str(Path(__file__).parent))
    from config import PDF_DIR, FAISS_INDEX_DIR

    # Determine embedding provider from environment
    openai_key = os.getenv("OPENAI_API_KEY", "")
    gemini_key = os.getenv("GEMINI_API_KEY", "")

    if openai_key:
        from providers.openai import OpenAIEmbeddingProvider
        emb = OpenAIEmbeddingProvider(openai_key)
        print("[INFO] Using OpenAI text-embedding-3-small (1536 dims)")
    elif gemini_key:
        from providers.gemini import GeminiEmbeddingProvider
        emb = GeminiEmbeddingProvider(gemini_key)
        print("[INFO] Using Gemini gemini-embedding-001 (768 dims)")
    else:
        print("[ERROR] Set OPENAI_API_KEY or GEMINI_API_KEY in your .env before running ingestion.")
        sys.exit(1)

    pipeline = PDFIngestionPipeline(PDF_DIR, FAISS_INDEX_DIR, embedding_provider=emb)
    result = pipeline.ingest()
    print(result)
