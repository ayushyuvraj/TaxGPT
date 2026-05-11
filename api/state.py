"""Global state for background jobs and engine caching"""

import os
import threading
from dataclasses import dataclass, field
from collections import deque
from typing import Dict, Tuple, Optional, Any
from datetime import datetime


@dataclass
class IngestionState:
    """Tracks background FAISS ingestion job"""
    status: str = "idle"  # idle, running, complete, error
    progress_pct: float = 0.0
    messages: deque = field(default_factory=lambda: deque(maxlen=100))
    thread: Optional[threading.Thread] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    job_id: str = ""

    def add_message(self, msg: str):
        """Thread-safe message append"""
        self.messages.append(msg)


# Global ingestion state
ingestion_state = IngestionState()
ingestion_lock = threading.Lock()

# Engine cache: (provider, api_key) -> engine instance
# Prevents re-instantiating the same engine for the same API key
engine_cache: Dict[Tuple[str, str], Any] = {}
engine_lock = threading.Lock()


def get_engine_from_cache(provider: str, api_key: str, engine_type: str, openai_key: str = "") -> Any:
    """
    Get or create a cached engine instance for the given provider/key combo.

    Args:
        provider: "gemini", "claude", "openai", etc. (used for generation)
        api_key: The API key for the generation provider
        engine_type: "rag"
        openai_key: OpenAI key used for embeddings (index was built with OpenAI)
    """
    cache_key = (provider, api_key, engine_type, openai_key)

    with engine_lock:
        if cache_key in engine_cache:
            return engine_cache[cache_key]

        try:
            if engine_type == "rag":
                from src.rag_engine import get_rag_engine

                env_var_map = {
                    "gemini": "GEMINI_API_KEY",
                    "claude": "ANTHROPIC_API_KEY",
                    "openai": "OPENAI_API_KEY",
                    "openrouter": "OPENROUTER_API_KEY",
                }
                gen_env_key = env_var_map.get(provider, f"{provider.upper()}_API_KEY")
                old_gen = os.environ.get(gen_env_key)
                old_openai = os.environ.get("OPENAI_API_KEY")
                old_provider = os.environ.get("LLM_PROVIDER")

                try:
                    os.environ[gen_env_key] = api_key
                    os.environ["LLM_PROVIDER"] = provider
                    # Always set OpenAI key for embeddings (index built with OpenAI)
                    if openai_key:
                        os.environ["OPENAI_API_KEY"] = openai_key
                    elif provider == "openai":
                        os.environ["OPENAI_API_KEY"] = api_key

                    engine = get_rag_engine()
                    engine_cache[cache_key] = engine
                    return engine
                finally:
                    if old_gen is None:
                        os.environ.pop(gen_env_key, None)
                    else:
                        os.environ[gen_env_key] = old_gen
                    if old_openai is None:
                        os.environ.pop("OPENAI_API_KEY", None)
                    else:
                        os.environ["OPENAI_API_KEY"] = old_openai
                    if old_provider is None:
                        os.environ.pop("LLM_PROVIDER", None)
                    else:
                        os.environ["LLM_PROVIDER"] = old_provider
            else:
                raise ValueError(f"Unknown engine type: {engine_type}")
        except Exception as e:
            import traceback
            print(f"[ERROR] Failed to create engine: {e}")
            traceback.print_exc()
            raise


def clear_engine_cache():
    """Clear all cached engines (used when switching providers)"""
    with engine_lock:
        engine_cache.clear()


def get_engine(provider: str, api_key: str, openai_key: str = ""):
    """Get or create a RAG engine for this provider/key combo"""
    return get_engine_from_cache(provider, api_key, "rag", openai_key=openai_key)
