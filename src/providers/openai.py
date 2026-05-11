"""OpenAI provider implementation"""

import time
from typing import List, Optional
from openai import OpenAI

from .base import EmbeddingProvider, GenerationProvider


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """OpenAI embedding provider"""

    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)
        self.model = "text-embedding-3-small"
        self.dimension = 1536  # OpenAI small embedding dimension

    def embed_text(self, text: str) -> List[float]:
        """Embed a single text"""
        return self.embed_batch([text])[0]

    def embed_texts(self, texts: List[str], batch_size: int = 20) -> List[List[float]]:
        """Embed texts (backward compatibility)"""
        return self.embed_batch(texts, batch_size)

    def embed_batch(self, texts: List[str], batch_size: int = 20) -> List[List[float]]:
        """Embed texts using OpenAI with rate limiting"""
        embeddings = []
        max_retries = 3
        initial_backoff = 2

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            backoff = initial_backoff

            for attempt in range(max_retries):
                try:
                    result = self.client.embeddings.create(
                        model=self.model,
                        input=batch
                    )
                    for item in result.data:
                        embeddings.append(item.embedding)
                    break

                except Exception as e:
                    error_str = str(e)
                    # Don't retry auth errors — fail immediately
                    if "401" in error_str or "403" in error_str or "API_KEY" in error_str:
                        raise
                    # Only retry rate limit errors
                    if attempt < max_retries - 1 and ("429" in error_str or "rate" in error_str.lower()):
                        print(f"    Retry {attempt + 1}/{max_retries} after {backoff}s (rate limited)...")
                        time.sleep(backoff)
                        backoff = min(backoff * 2, 60)
                    else:
                        raise

            if i + batch_size < len(texts):
                time.sleep(0.5)

        return embeddings

    def get_embedding_dimension(self) -> int:
        return self.dimension


class OpenAIGenerationProvider(GenerationProvider):
    """OpenAI generation provider"""

    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o"

    def generate(self, prompt: str, system_prompt: Optional[str] = None, chat_history: List[dict] = None) -> str:
        """Generate text using OpenAI"""
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
            raise Exception(f"OpenAI generation failed: {e}")

    def extract_from_image(self, image_bytes: bytes, mime_type: str, prompt: str) -> str:
        """Extract text from an image using GPT-4o vision"""
        try:
            import base64
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:{mime_type};base64,{b64}"},
                            },
                            {"type": "text", "text": prompt},
                        ],
                    }
                ],
                max_tokens=2000,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            raise Exception(f"OpenAI image extraction failed: {e}")

    def stream_generate(self, prompt: str, system_prompt: Optional[str] = None, chat_history: List[dict] = None):
        """Stream generation from OpenAI"""
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
                if chunk.choices and len(chunk.choices) > 0:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content

        except Exception as e:
            raise Exception(f"OpenAI streaming failed: {e}")
