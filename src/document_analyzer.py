"""Document text extraction for AI Assistant GenNext"""

import io
from pathlib import Path
from typing import Optional

INVOICE_KEYWORDS = {
    "gst", "cgst", "sgst", "igst", "invoice", "bill", "receipt",
    "tax invoice", "hsn", "sac", "total amount", "grand total", "subtotal",
}

TAX_KEYWORDS = {
    # Income Tax Act terms
    "income tax", "section", "tax year", "assessment", "tds", "itc", "itr",
    "form 130", "form 168", "salary", "pension", "capital gains", "deduction",
    "rebate", "relief", "surcharge", "cess", "tax slab", "tax rate",
    # Invoice/GST terms
    "gst", "cgst", "sgst", "igst", "hsn", "sac", "invoice", "receipt", "bill",
    "tax invoice", "e-invoice", "e-way bill",
    # Financial/payroll terms
    "salary", "tds", "hra", "da", "allowance", "pfund", "esi", "payslip",
    "form 16", "form 12ba", "challan", "aadhar", "pan", "tan",
    # Documents
    "income", "tax", "financial", "statement", "invoice", "receipt", "eandc",
}

MAX_CHARS = 12000


class DocumentAnalyzer:
    """Extract text from PDFs and images for document-aware Q&A"""

    def extract(
        self,
        file_bytes: bytes,
        filename: str,
        generation_provider=None,
    ) -> dict:
        """
        Extract text from a document file.
        Returns {text, page_count, char_count, truncated, error, format_type, is_invoice_likely}
        """
        ext = Path(filename).suffix.lower()
        if ext == ".pdf":
            return self._extract_pdf(file_bytes, generation_provider)
        elif ext in (".jpg", ".jpeg"):
            return self._extract_image(file_bytes, "image/jpeg", generation_provider)
        elif ext == ".png":
            return self._extract_image(file_bytes, "image/png", generation_provider)
        elif ext == ".webp":
            return self._extract_image(file_bytes, "image/webp", generation_provider)
        else:
            return {
                "text": "",
                "page_count": 0,
                "char_count": 0,
                "truncated": False,
                "error": f"Unsupported format '{ext}'. Supported: PDF, JPG, PNG, WEBP",
                "format_type": "unknown",
                "is_invoice_likely": False,
            }

    def _extract_pdf(self, file_bytes: bytes, provider=None) -> dict:
        """Extract text from PDF using PyPDF2; suggest image upload if scanned"""
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            page_count = len(reader.pages)
            parts = []
            for page in reader.pages:
                txt = page.extract_text()
                if txt:
                    parts.append(txt.strip())
            full_text = "\n\n".join(parts).strip()

            if full_text:
                truncated = len(full_text) > MAX_CHARS
                text = full_text[:MAX_CHARS]
                return {
                    "text": text,
                    "page_count": page_count,
                    "char_count": len(full_text),
                    "truncated": truncated,
                    "error": None,
                    "format_type": "pdf_text",
                    "is_invoice_likely": self._detect_invoice(text),
                }

            # Scanned PDF — no text layer
            return {
                "text": "",
                "page_count": page_count,
                "char_count": 0,
                "truncated": False,
                "error": (
                    "This PDF appears to be scanned (image-only). "
                    "Please upload a JPG or PNG screenshot of your document instead."
                ),
                "format_type": "pdf_vision",
                "is_invoice_likely": False,
            }
        except Exception as e:
            return {
                "text": "",
                "page_count": 0,
                "char_count": 0,
                "truncated": False,
                "error": f"PDF extraction failed: {e}",
                "format_type": "pdf_text",
                "is_invoice_likely": False,
            }

    def _extract_image(self, file_bytes: bytes, mime_type: str, provider=None) -> dict:
        """Extract text from an image using LLM vision"""
        if not provider or not hasattr(provider, "extract_from_image"):
            return {
                "text": "",
                "page_count": 1,
                "char_count": 0,
                "truncated": False,
                "error": (
                    "Image extraction requires a vision-capable AI provider "
                    "(Gemini or OpenAI). Please configure one."
                ),
                "format_type": "image_vision",
                "is_invoice_likely": False,
            }
        try:
            from prompts import DOCUMENT_EXTRACTION_PROMPT
            extracted = provider.extract_from_image(file_bytes, mime_type, DOCUMENT_EXTRACTION_PROMPT)
            if not extracted or not extracted.strip():
                return {
                    "text": "",
                    "page_count": 1,
                    "char_count": 0,
                    "truncated": False,
                    "error": "Could not extract text from image.",
                    "format_type": "image_vision",
                    "is_invoice_likely": False,
                }
            truncated = len(extracted) > MAX_CHARS
            text = extracted[:MAX_CHARS]
            return {
                "text": text,
                "page_count": 1,
                "char_count": len(extracted),
                "truncated": truncated,
                "error": None,
                "format_type": "image_vision",
                "is_invoice_likely": self._detect_invoice(text),
            }
        except Exception as e:
            return {
                "text": "",
                "page_count": 1,
                "char_count": 0,
                "truncated": False,
                "error": f"Image vision extraction failed: {e}",
                "format_type": "image_vision",
                "is_invoice_likely": False,
            }

    def _detect_invoice(self, text: str) -> bool:
        """Heuristic: check if text looks like an invoice/receipt"""
        lower = text.lower()
        found = sum(1 for kw in INVOICE_KEYWORDS if kw in lower)
        return found >= 2

    def validate_tax_related(self, text: str) -> tuple[bool, Optional[str]]:
        """
        Validate if extracted text is tax-related.
        Returns (is_valid, message).
        is_valid=True if document appears tax-related.
        message contains friendly feedback if validation fails.
        """
        if not text or len(text.strip()) < 20:
            return False, "Document appears empty or too short. Please upload a readable document."

        lower = text.lower()
        found = sum(1 for kw in TAX_KEYWORDS if kw in lower)

        # Threshold: at least 3 tax-related keywords for valid documents
        if found >= 3:
            return True, None

        # Not enough tax keywords — likely not a tax document
        return False, (
            "This document doesn't appear to be a tax-related document "
            "(invoice, payslip, tax form, etc.). "
            "Please upload a tax invoice, payslip, Form 16, or other tax document."
        )
