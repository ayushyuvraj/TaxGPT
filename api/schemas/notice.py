"""Notice decoder request/response schemas"""

from pydantic import BaseModel, Field
from typing import Optional


class NoticeRequest(BaseModel):
    """Request to decode a tax notice"""
    notice_text: str = Field(min_length=50, max_length=10000, description="Tax notice content")


class NoticeMetadata(BaseModel):
    """Metadata extracted from notice"""
    notice_type: Optional[str] = None
    sections: list[str] = Field(default_factory=list)
    dates: list[str] = Field(default_factory=list)
    severity: Optional[str] = None  # "Low", "Medium", "High"


class NoticeResponse(BaseModel):
    """Response from notice decoder"""
    analysis: str
    source: str  # "gemini" or "regex"
    error: bool = False
    metadata: Optional[NoticeMetadata] = None
