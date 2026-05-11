"""Health check endpoint"""
import os
import json
from pathlib import Path
from fastapi import APIRouter
from api.schemas.common import HealthResponse

router = APIRouter(prefix="/api/v1", tags=["health"])

_INDEX_PATH = Path("data/faiss_index/index.faiss")
_CHUNKS_PATH = Path("data/faiss_index/chunks.json")


def _get_vector_count() -> int:
    if not _CHUNKS_PATH.exists():
        return 0
    try:
        data = json.loads(_CHUNKS_PATH.read_text(encoding="utf-8"))
        return len(data) if isinstance(data, list) else 0
    except Exception:
        return 0


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check API health and FAISS index status"""
    vector_count = _get_vector_count()
    index_ready = _INDEX_PATH.exists() and vector_count > 0
    provider = os.environ.get("LLM_PROVIDER", "gemini")

    return HealthResponse(
        status="healthy",
        index_ready=index_ready,
        provider=provider,
        vector_count=vector_count,
    )


@router.get("/config")
async def get_config():
    """Get configured API providers from backend .env file"""
    return {
        "gemini_key": os.getenv("GEMINI_API_KEY", ""),
        "openai_key": os.getenv("OPENAI_API_KEY", ""),
        "anthropic_key": os.getenv("ANTHROPIC_API_KEY", ""),
        "openrouter_key": os.getenv("OPENROUTER_API_KEY", ""),
        "ollama_url": os.getenv("OLLAMA_URL", "http://localhost:11434"),
        "llm_provider": os.getenv("LLM_PROVIDER", "gemini"),
    }
