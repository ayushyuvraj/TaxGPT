"""Provider factory for LLM abstraction"""

import os
from typing import Tuple, Optional
from .base import EmbeddingProvider, GenerationProvider
from .gemini import GeminiEmbeddingProvider, GeminiGenerationProvider
from .openai import OpenAIEmbeddingProvider, OpenAIGenerationProvider
from .ollama import OllamaGenerationProvider


def get_providers(
    provider_name: Optional[str] = None,
    embedding_key: Optional[str] = None,
    generation_key: Optional[str] = None,
) -> Tuple[EmbeddingProvider, GenerationProvider]:
    """
    Factory function to get embedding and generation providers.

    Args:
        provider_name: "gemini", "openai", etc. (defaults to LLM_PROVIDER env var)
        embedding_key: API key for embeddings (defaults to env vars)
        generation_key: API key for generation (defaults to env vars)

    Returns:
        Tuple of (EmbeddingProvider, GenerationProvider)
    """
    provider_name = provider_name or os.getenv("LLM_PROVIDER", "gemini")
    provider_name = provider_name.lower()

    if provider_name == "gemini":
        embedding_key = embedding_key or os.getenv("GEMINI_API_KEY")
        generation_key = generation_key or os.getenv("GEMINI_API_KEY")
        return (
            GeminiEmbeddingProvider(embedding_key),
            GeminiGenerationProvider(generation_key),
        )
    elif provider_name == "openai":
        embedding_key = embedding_key or os.getenv("OPENAI_API_KEY")
        generation_key = generation_key or os.getenv("OPENAI_API_KEY")
        return (
            OpenAIEmbeddingProvider(embedding_key),
            OpenAIGenerationProvider(generation_key),
        )
    elif provider_name == "ollama":
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        model = os.getenv("OLLAMA_MODEL", "mistral")
        api_key = os.getenv("OLLAMA_API_KEY", "ollama")
        # Embeddings fall back to OpenAI (FAISS index is already built with OpenAI embeddings)
        fallback_openai_key = os.getenv("OPENAI_API_KEY", "")
        return (
            OpenAIEmbeddingProvider(fallback_openai_key),
            OllamaGenerationProvider(base_url=base_url, model=model, api_key=api_key),
        )
    else:
        raise ValueError(f"Unknown provider: {provider_name}")


__all__ = [
    "EmbeddingProvider",
    "GenerationProvider",
    "GeminiEmbeddingProvider",
    "GeminiGenerationProvider",
    "OpenAIEmbeddingProvider",
    "OpenAIGenerationProvider",
    "get_providers",
]
