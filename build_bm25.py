#!/usr/bin/env python3
"""Build BM25 index from existing chunks."""
import json
import pickle
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'src'))

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    print("ERROR: rank_bm25 not installed. Run: pip install rank-bm25")
    sys.exit(1)

from config import FAISS_INDEX_DIR

try:
    chunks_path = FAISS_INDEX_DIR / "chunks.json"

    if not chunks_path.exists():
        print("ERROR: chunks.json not found. Run ingestion first.")
        sys.exit(1)

    print("Loading chunks...")
    with open(chunks_path, encoding="utf-8") as f:
        chunks = json.load(f)

    print(f"Building BM25 index from {len(chunks)} chunks...")

    # Tokenize
    chunk_texts = [c.get("text", "") for c in chunks]
    tokenized_corpus = [text.lower().split() for text in chunk_texts]

    # Build BM25
    bm25 = BM25Okapi(tokenized_corpus)

    # Save
    bm25_path = FAISS_INDEX_DIR / "bm25_index.pkl"
    with open(bm25_path, "wb") as f:
        pickle.dump(bm25, f)

    print(f"BM25 index saved to {bm25_path}")
    print("SUCCESS! BM25 index is ready.")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
