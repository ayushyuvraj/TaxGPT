"""AI Assistant GenNext Q&A request/response schemas"""

from pydantic import BaseModel, Field
from typing import Optional
from api.schemas.qa import ChatMessage, Source


class QAGenNextRequest(BaseModel):
    question: str = Field(min_length=10, max_length=2000, description="Tax question")
    chat_history: list[ChatMessage] = Field(default_factory=list)
    language: str = Field(default="English")
    doc_context: Optional[str] = Field(default=None, max_length=15000)
    is_invoice: bool = Field(default=False)


class QAGenNextResponse(BaseModel):
    answer: str
    error: bool
    sources: list[Source]
    filtered: bool = False
