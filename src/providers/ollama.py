"""Ollama provider — OpenAI-compatible, supports local and cloud models"""

from typing import List, Optional
from openai import OpenAI

from .base import GenerationProvider


class OllamaGenerationProvider(GenerationProvider):
    """
    Ollama generation provider (OpenAI-compatible API).

    Works for both local (http://localhost:11434) and cloud endpoints.
    For local use, api_key can be any non-empty string (Ollama ignores it).
    For Ollama Cloud, api_key must be a valid cloud API key.
    """

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "mistral", api_key: str = "ollama"):
        self.model = model
        # Ollama's API is OpenAI-compatible; append /v1 if not already present
        if not base_url.rstrip("/").endswith("/v1"):
            base_url = base_url.rstrip("/") + "/v1"
        self.client = OpenAI(
            api_key=api_key or "ollama",
            base_url=base_url,
        )

    def generate(self, prompt: str, system_prompt: Optional[str] = None, chat_history: List[dict] = None) -> str:
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if chat_history:
                messages.extend(chat_history)
            messages.append({"role": "user", "content": prompt})

            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=2000,
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"Ollama generation failed: {e}")

    def stream_generate(self, prompt: str, system_prompt: Optional[str] = None, chat_history: List[dict] = None):
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if chat_history:
                messages.extend(chat_history)
            messages.append({"role": "user", "content": prompt})

            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=2000,
                stream=True,
            )
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            raise Exception(f"Ollama streaming failed: {e}")
