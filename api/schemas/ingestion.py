"""Ingestion control schemas"""

from pydantic import BaseModel


class IngestionStartRequest(BaseModel):
    """Request to start FAISS ingestion"""
    openai_key: str = ""
    gemini_key: str = ""


class IngestionStartResponse(BaseModel):
    """Response when ingestion starts"""
    job_id: str
    status: str  # "started" or "already_running"
