"""FAISS index ingestion endpoints"""
import threading
import uuid
from fastapi import APIRouter
from pathlib import Path
import sys

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from api.schemas.ingestion import IngestionStartRequest, IngestionStartResponse
from api.schemas.common import IngestionStatusResponse
from api.state import ingestion_state
from ingest import PDFIngestionPipeline

router = APIRouter(prefix="/api/v1", tags=["ingestion"])


def run_ingestion(openai_key: str = "", gemini_key: str = ""):
    """Background task to run PDF ingestion"""
    try:
        ingestion_state.status = "running"
        ingestion_state.progress_pct = 0

        def log(msg: str, pct: float = 0.0):
            ingestion_state.progress_pct = pct
            ingestion_state.add_message(msg)

        # Select embedding provider based on provided keys
        if openai_key:
            from providers.openai import OpenAIEmbeddingProvider
            embedding_provider = OpenAIEmbeddingProvider(openai_key)
            log("[INFO] Using OpenAI text-embedding-3-small (1536 dims)", 1)
        elif gemini_key:
            from providers.gemini import GeminiEmbeddingProvider
            embedding_provider = GeminiEmbeddingProvider(gemini_key)
            log("[INFO] Using Gemini gemini-embedding-001 (768 dims)", 1)
        else:
            raise ValueError(
                "An API key is required for ingestion. "
                "Provide openai_key (recommended) or gemini_key in the request."
            )

        pipeline = PDFIngestionPipeline(
            embedding_provider=embedding_provider,
            progress_callback=log,
        )
        result = pipeline.run()

        ingestion_state.status = "complete"
        ingestion_state.progress_pct = 100
        ingestion_state.add_message(
            f"[OK] Done! {result.get('chunks_count', 0)} chunks, "
            f"{result.get('vectors', 0)} vectors indexed."
        )
    except Exception as e:
        ingestion_state.status = "failed"
        ingestion_state.error_message = str(e)
        ingestion_state.add_message(f"[ERROR] Ingestion failed: {str(e)}")


@router.post("/ingestion/start", response_model=IngestionStartResponse)
async def start_ingestion(request: IngestionStartRequest) -> IngestionStartResponse:
    """Start FAISS index ingestion in background"""
    if ingestion_state.status == "running":
        return IngestionStartResponse(
            job_id=ingestion_state.job_id,
            status="already_running"
        )

    job_id = str(uuid.uuid4())
    ingestion_state.job_id = job_id

    thread = threading.Thread(
        target=run_ingestion,
        kwargs={"openai_key": request.openai_key, "gemini_key": request.gemini_key},
        daemon=False,
    )
    ingestion_state.thread = thread
    thread.start()

    return IngestionStartResponse(job_id=job_id, status="started")


@router.get("/ingestion/status", response_model=IngestionStatusResponse)
async def get_ingestion_status() -> IngestionStatusResponse:
    """Get current ingestion status and progress"""
    log_tail = list(ingestion_state.messages)[-20:]

    return IngestionStatusResponse(
        status=ingestion_state.status,
        progress_pct=ingestion_state.progress_pct,
        message=ingestion_state.error_message or f"Ingestion {ingestion_state.status}",
        log_tail=log_tail,
    )
