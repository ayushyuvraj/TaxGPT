"""AI Assistant GenNext endpoints — grounded answers with streaming and doc context"""

import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from api.schemas.qa_gennext import QAGenNextRequest, QAGenNextResponse
from api.dependencies import get_api_key_config, APIKeyConfig
from api.state import get_engine

router = APIRouter(prefix="/api/v1", tags=["qa-gennext"])


def _flatten_chat_history(chat_history) -> list:
    """Convert ChatMessage list to role-based format for the engine"""
    return [
        {"role": "user" if i % 2 == 0 else "assistant", "content": msg}
        for i, msg in enumerate(
            [item for turn in chat_history for item in [turn.question, turn.answer]]
        )
    ]


@router.post("/qa-gennext/answer", response_model=QAGenNextResponse)
async def answer_gennext(
    request: QAGenNextRequest,
    api_config: APIKeyConfig = Depends(get_api_key_config),
) -> QAGenNextResponse:
    """Grounded tax Q&A with zero-hallucination mode (non-streaming)"""
    provider = api_config.provider or "gemini"
    key = api_config.get_key_for_provider()

    if not key and provider != "ollama":
        raise HTTPException(
            status_code=400,
            detail=f"API key for provider '{provider}' not provided.",
        )

    try:
        api_config.set_env_vars()
        engine = get_engine(provider, key, openai_key=api_config.openai_key)
        chat_history = _flatten_chat_history(request.chat_history)

        result = engine.answer_gennext(
            question=request.question,
            chat_history=chat_history,
            language=request.language,
            doc_context=request.doc_context,
            is_invoice=request.is_invoice,
        )
        return QAGenNextResponse(**result)
    except Exception as e:
        return QAGenNextResponse(
            answer=f"Error processing question: {e}",
            error=True,
            sources=[],
        )


@router.post("/qa-gennext/stream")
async def stream_gennext(
    request: QAGenNextRequest,
    api_config: APIKeyConfig = Depends(get_api_key_config),
):
    """Grounded tax Q&A with streaming SSE response"""
    provider = api_config.provider or "gemini"
    key = api_config.get_key_for_provider()

    if not key and provider != "ollama":
        raise HTTPException(
            status_code=400,
            detail=f"API key for provider '{provider}' not provided.",
        )

    api_config.set_env_vars()

    try:
        engine = get_engine(provider, key, openai_key=api_config.openai_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize engine: {e}")

    chat_history = _flatten_chat_history(request.chat_history)

    def event_generator():
        try:
            for event in engine.answer_gennext_stream(
                question=request.question,
                chat_history=chat_history,
                language=request.language,
                doc_context=request.doc_context,
                is_invoice=request.is_invoice,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'chunk': f'Error: {e}'})}\n\n"
            yield f"data: {json.dumps({'sources': [], 'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
