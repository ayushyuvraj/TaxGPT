"""Tax Q&A request/response schemas"""

from pydantic import BaseModel, Field
from typing import Optional


class ChatMessage(BaseModel):
    """A single Q&A turn in chat history"""
    question: str
    answer: str


class QARequest(BaseModel):
    """Request to answer a tax question"""
    question: str = Field(min_length=10, max_length=2000, description="Tax question")
    chat_history: list[ChatMessage] = Field(default_factory=list, description="Previous Q&A turns")
    language: str = Field(default="English", description="Response language")


class Source(BaseModel):
    """Citation source for an answer"""
    source: str
    section: Optional[str] = None
    text: Optional[str] = None


class QAResponse(BaseModel):
    """Response to a Q&A request"""
    answer: str
    error: bool
    sources: list[Source]
    filtered: bool = False  # True if question was filtered out as non-tax-related
