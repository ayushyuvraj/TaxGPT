#!/usr/bin/env python3
"""Run the PDF ingestion pipeline."""
import os
import sys
from pathlib import Path

# Set up path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

# Unbuffered output on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

try:
    from config import PDF_DIR, FAISS_INDEX_DIR, OPENAI_API_KEY
    from ingest import PDFIngestionPipeline
    from providers.openai import OpenAIEmbeddingProvider

    print("=" * 60)
    print("TaxGPT PDF Ingestion Pipeline")
    print("=" * 60)

    if not OPENAI_API_KEY:
        print("ERROR: OPENAI_API_KEY not set in .env")
        sys.exit(1)

    print(f"Using OpenAI text-embedding-3-small (1536 dims)")
    emb = OpenAIEmbeddingProvider(OPENAI_API_KEY)

    pipeline = PDFIngestionPipeline(PDF_DIR, FAISS_INDEX_DIR, embedding_provider=emb)
    result = pipeline.ingest()

    print("\nIngestion Result:")
    print(f"Status: {result.get('status')}")
    print(f"Chunks: {result.get('chunks_count')}")
    print(f"Parents: {result.get('parents_count')}")
    print(f"Vectors: {result.get('vectors')}")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
