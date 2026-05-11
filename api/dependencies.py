"""Dependency injection for API key handling"""

import os
from fastapi import Header, HTTPException
from typing import Optional


class APIKeyConfig:
    """Holds the API key configuration from request headers"""

    def __init__(
        self,
        provider: str = Header(default="gemini", alias="x-provider"),
        gemini_key: Optional[str] = Header(default=None, alias="x-gemini-key"),
        anthropic_key: Optional[str] = Header(default=None, alias="x-anthropic-key"),
        openai_key: Optional[str] = Header(default=None, alias="x-openai-key"),
        openrouter_key: Optional[str] = Header(default=None, alias="x-openrouter-key"),
        openrouter_model: Optional[str] = Header(default=None, alias="x-openrouter-model"),
        ollama_url: Optional[str] = Header(default=None, alias="x-ollama-url"),
        ollama_model: Optional[str] = Header(default=None, alias="x-ollama-model"),
        ollama_key: Optional[str] = Header(default=None, alias="x-ollama-key"),
    ):
        self.provider = provider.lower()
        self.gemini_key = gemini_key or os.getenv("GEMINI_API_KEY", "")
        self.anthropic_key = anthropic_key or os.getenv("ANTHROPIC_API_KEY", "")
        self.openai_key = openai_key or os.getenv("OPENAI_API_KEY", "")
        self.openrouter_key = openrouter_key or os.getenv("OPENROUTER_API_KEY", "")
        self.openrouter_model = openrouter_model or os.getenv("OPENROUTER_MODEL", "openai/gpt-4")
        self.ollama_url = ollama_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model = ollama_model or os.getenv("OLLAMA_MODEL", "mistral")
        self.ollama_key = ollama_key or os.getenv("OLLAMA_API_KEY", "")

    def get_key_for_provider(self) -> str:
        """Get the API key for the current provider"""
        key_map = {
            "gemini": self.gemini_key,
            "claude": self.anthropic_key,
            "openai": self.openai_key,
            "openrouter": self.openrouter_key,
            "ollama": self.ollama_key,
        }
        key = key_map.get(self.provider, "")
        if not key and self.provider not in ("ollama",):
            # Don't fail for ollama (local)
            pass  # Allow empty key - API layer will handle gracefully
        return key

    def set_env_vars(self):
        """Temporarily set environment variables for this request"""
        os.environ["LLM_PROVIDER"] = self.provider
        if self.gemini_key:
            os.environ["GEMINI_API_KEY"] = self.gemini_key
        if self.anthropic_key:
            os.environ["ANTHROPIC_API_KEY"] = self.anthropic_key
        if self.openai_key:
            os.environ["OPENAI_API_KEY"] = self.openai_key
        if self.openrouter_key:
            os.environ["OPENROUTER_API_KEY"] = self.openrouter_key
            os.environ["OPENROUTER_MODEL"] = self.openrouter_model
        if self.ollama_url:
            os.environ["OLLAMA_BASE_URL"] = self.ollama_url
        if self.ollama_model:
            os.environ["OLLAMA_MODEL"] = self.ollama_model
        if self.ollama_key:
            os.environ["OLLAMA_API_KEY"] = self.ollama_key


async def get_api_key_config(
    provider: str = Header(default="gemini", alias="x-provider"),
    gemini_key: Optional[str] = Header(default=None, alias="x-gemini-key"),
    anthropic_key: Optional[str] = Header(default=None, alias="x-anthropic-key"),
    openai_key: Optional[str] = Header(default=None, alias="x-openai-key"),
    openrouter_key: Optional[str] = Header(default=None, alias="x-openrouter-key"),
    openrouter_model: Optional[str] = Header(default=None, alias="x-openrouter-model"),
    ollama_url: Optional[str] = Header(default=None, alias="x-ollama-url"),
    ollama_model: Optional[str] = Header(default=None, alias="x-ollama-model"),
    ollama_key: Optional[str] = Header(default=None, alias="x-ollama-key"),
) -> APIKeyConfig:
    """FastAPI dependency to inject API key configuration from headers"""
    config = APIKeyConfig(
        provider=provider,
        gemini_key=gemini_key,
        anthropic_key=anthropic_key,
        openai_key=openai_key,
        openrouter_key=openrouter_key,
        openrouter_model=openrouter_model,
        ollama_url=ollama_url,
        ollama_model=ollama_model,
        ollama_key=ollama_key,
    )
    # Set environment variables for this request
    config.set_env_vars()
    return config
