"""Document upload request/response schemas"""

from pydantic import BaseModel
from typing import Optional


class DocumentUploadResponse(BaseModel):
    filename: str
    extracted_text: str
    page_count: int
    char_count: int
    truncated: bool
    error: Optional[str] = None
    success: bool
    is_invoice_likely: bool = False
    format_type: str = "unknown"
    is_tax_related: bool = True  # Whether content appears tax-related (invoices, tax docs, etc)
    validation_message: Optional[str] = None  # User-friendly message if not tax-related
