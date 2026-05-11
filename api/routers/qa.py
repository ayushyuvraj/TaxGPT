"""Tax Q&A endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from pathlib import Path
import sys

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from api.schemas.qa import QARequest, QAResponse
from api.dependencies import get_api_key_config, APIKeyConfig
from api.state import get_engine
from rag_engine import TaxRAGEngine

router = APIRouter(prefix="/api/v1", tags=["qa"])


@router.post("/qa/answer", response_model=QAResponse)
async def answer_question(
    request: QARequest,
    api_config: APIKeyConfig = Depends(get_api_key_config),
) -> QAResponse:
    """Answer a tax question using RAG"""
    # Verify API key is provided
    provider = api_config.provider or "gemini"
    key = api_config.get_key_for_provider()

    if not key:
        raise HTTPException(
            status_code=400,
            detail=f"API key for provider '{provider}' not provided. Set X-{provider.upper()}-Key header.",
        )

    try:
        # Set environment variables for this request
        api_config.set_env_vars()

        # Always pass OpenAI key for embeddings (FAISS index built with OpenAI)
        engine = get_engine(provider, key, openai_key=api_config.openai_key)

        # Prepare chat history
        chat_history = [
            {"role": "user" if i % 2 == 0 else "assistant", "content": msg}
            for i, msg in enumerate([item for turn in request.chat_history for item in [turn.question, turn.answer]])
        ]

        # Call engine
        result = engine.answer(
            question=request.question,
            chat_history=chat_history,
            language=request.language,
        )

        return QAResponse(**result)

    except Exception as e:
        return QAResponse(
            answer=f"Error processing question: {str(e)}",
            error=True,
            sources=[],
            filtered=False,
        )
