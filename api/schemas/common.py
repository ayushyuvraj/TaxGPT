"""Common schemas used across all endpoints"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ErrorResponse(BaseModel):
    """Standard error response"""
    detail: str
    code: str  # VALIDATION_ERROR, API_KEY_MISSING, QUOTA_EXCEEDED, INDEX_NOT_READY, etc.


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = "ok"
    index_ready: bool
    provider: str
    vector_count: int = 0


class IngestionStatusResponse(BaseModel):
    """Status of FAISS ingestion job"""
    status: str  # idle, running, complete, error
    progress_pct: float
    message: str
    log_tail: list[str]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
