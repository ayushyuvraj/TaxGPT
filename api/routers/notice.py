"""Tax notice decoder endpoints"""
from fastapi import APIRouter, Depends
from pathlib import Path
import sys

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from api.schemas.notice import NoticeRequest, NoticeResponse
from api.dependencies import get_api_key_config, APIKeyConfig
from notice_decoder import NoticeDecoder

router = APIRouter(prefix="/api/v1", tags=["notice"])


@router.post("/notice/decode", response_model=NoticeResponse)
async def decode_notice(
    request: NoticeRequest,
    api_config: APIKeyConfig = Depends(get_api_key_config),
) -> NoticeResponse:
    """Decode and analyze a tax notice"""
    try:
        api_config.set_env_vars()
        decoder = NoticeDecoder()
        result = decoder.decode(request.notice_text)
        return NoticeResponse(**result)
    except Exception as e:
        return NoticeResponse(
            analysis=f"Error decoding notice: {str(e)}",
            source="error",
            error=True,
            metadata=None,
        )
