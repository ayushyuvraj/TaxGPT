"""Document upload endpoint — stateless PDF/image text extraction"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from api.schemas.document import DocumentUploadResponse
from api.dependencies import get_api_key_config, APIKeyConfig

router = APIRouter(prefix="/api/v1", tags=["document"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}


def _get_gen_provider(api_config: APIKeyConfig):
    """Create a generation provider (no FAISS) for image vision extraction"""
    provider = api_config.provider
    if provider == "gemini" and api_config.gemini_key:
        from providers.gemini import GeminiGenerationProvider
        return GeminiGenerationProvider(api_config.gemini_key)
    elif provider == "openai" and api_config.openai_key:
        from providers.openai import OpenAIGenerationProvider
        return OpenAIGenerationProvider(api_config.openai_key)
    return None


@router.post("/document/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    api_config: APIKeyConfig = Depends(get_api_key_config),
) -> DocumentUploadResponse:
    """
    Accept a PDF or image file, extract its text, return the text to the frontend.
    Backend stores NOTHING — this is a stateless text extraction service.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Supported: PDF, JPG, PNG, WEBP",
        )

    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB",
        )

    gen_provider = _get_gen_provider(api_config)

    from document_analyzer import DocumentAnalyzer
    analyzer = DocumentAnalyzer()
    result = analyzer.extract(file_bytes, file.filename, generation_provider=gen_provider)

    # Validate if document is tax-related
    extracted_text = result.get("text", "")
    is_tax_related = True
    validation_message = None

    if extracted_text.strip():
        is_tax_related, validation_message = analyzer.validate_tax_related(extracted_text)

    return DocumentUploadResponse(
        filename=file.filename,
        extracted_text=extracted_text if is_tax_related else "",  # Don't send untax-related content to chat
        page_count=result.get("page_count", 0),
        char_count=result.get("char_count", len(extracted_text)),
        truncated=result.get("truncated", False),
        error=result.get("error"),
        success=not bool(result.get("error")) and bool(extracted_text.strip()) and is_tax_related,
        is_invoice_likely=result.get("is_invoice_likely", False),
        format_type=result.get("format_type", "unknown"),
        is_tax_related=is_tax_related,
        validation_message=validation_message,
    )
