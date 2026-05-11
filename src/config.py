"""TaxGPT Configuration: API keys, models, constants"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env with UTF-8 BOM handling for Windows
try:
    load_dotenv(encoding="utf-8-sig")
except Exception:
    pass

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

# LLM Provider (default to provider from env or fallback to first available)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")

# LLM Models
EMBEDDING_MODEL = "gemini-embedding-001"
GENERATION_MODEL = "gemini-2.5-flash"

# Vector Store
FAISS_INDEX_DIR = Path(__file__).parent.parent / "data" / "faiss_index"
FAISS_INDEX_DIR_GEMINI = Path(__file__).parent.parent / "data" / "faiss_index_gemini"
FAISS_INDEX_PATH = FAISS_INDEX_DIR / "index.faiss"
FAISS_CHUNKS_PATH = FAISS_INDEX_DIR / "chunks.json"

# Retrieval Parameters
RETRIEVAL_TOP_K = 8
MAX_CHUNK_SIZE = 3000
CHUNK_OVERLAP = 200
EMBEDDING_BATCH_SIZE = 20

# Context Budget
CONTEXT_TOKEN_BUDGET = 4500
CHAT_HISTORY_MAX = 5
CHAT_HISTORY_CONTEXT = 3

# Data Paths
DATA_DIR = Path(__file__).parent.parent / "data"
SECTION_MAPPING_PATH = DATA_DIR / "section_mapping.json"
PDF_DIR = DATA_DIR / "pdfs"

# GenNext retrieval confidence (IndexFlatIP cosine similarity; higher = more relevant)
RETRIEVAL_CONFIDENCE_THRESHOLD = 0.35

# Hybrid Search & Advanced Retrieval
BM25_TOP_K = 20                    # BM25 keyword search retrieval count
HYBRID_MERGE_TOP_K = 30            # After RRF merge
RERANK_TOP_K = 8                   # Final count after re-ranking
CHILD_CHUNK_SIZE = 400             # Embedded child chunk size
CHILD_OVERLAP = 150                # Child chunk overlap
PARENT_CHUNK_SIZE = 2000           # Parent chunk max size (full context)

# Logging
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
QUERY_LOG_FILE = LOG_DIR / "queries.jsonl"
