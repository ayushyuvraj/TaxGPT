"""Base provider interfaces"""

from abc import ABC, abstractmethod
from typing import List, Generator


class EmbeddingProvider(ABC):
    """Abstract base for embedding providers"""

    @abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """Embed a single text"""
        pass

    @abstractmethod
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed a batch of texts"""
        pass


class GenerationProvider(ABC):
    """Abstract base for generation providers"""

    @abstractmethod
    def generate(self, prompt: str, system_prompt: str = "", chat_history: List[dict] = None) -> str:
        """Generate text given a prompt"""
        pass

    def stream_generate(self, prompt: str, system_prompt: str = "", chat_history: List[dict] = None) -> Generator[str, None, None]:
        """Streaming generation. Defaults to yielding full response in one chunk."""
        yield self.generate(prompt, system_prompt, chat_history)

    def extract_from_image(self, image_bytes: bytes, mime_type: str, prompt: str) -> str:
        """Extract text from an image. Override for vision support."""
        raise NotImplementedError("This provider does not support image extraction")
