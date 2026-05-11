"""TaxGPT India FastAPI application"""
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Add project root and src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))  # Project root
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import health, qa, mapper, profile, notice, ingestion, compare, qa_gennext, document


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup: warm up section mapper (pre-load JSON)
    try:
        from section_mapper import SectionMapper
        mapper = SectionMapper()
        print("[OK] Section mapper initialized at startup")
    except Exception as e:
        print(f"[WARN] Section mapper initialization failed: {e}")

    # Warm up section extractor in background thread (PDF scan is slow)
    import asyncio
    try:
        from api.utils.section_extractor import warm_up
        asyncio.get_event_loop().run_in_executor(None, warm_up)
        print("[OK] Section extractor warm-up started in background")
    except Exception as e:
        print(f"[WARN] Section extractor warm-up failed: {e}")

    yield

    # Shutdown: cleanup if needed
    print("[SHUTDOWN] TaxGPT API shutting down")


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    app = FastAPI(
        title="TaxGPT India API",
        description="RAG-powered AI tool for Indian tax guidance",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Configure CORS - allow frontend in dev and production
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:3000",
            "http://localhost:8080",
            frontend_url,
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(health.router)
    app.include_router(qa.router)
    app.include_router(mapper.router)
    app.include_router(profile.router)
    app.include_router(notice.router)
    app.include_router(ingestion.router)
    app.include_router(compare.router)
    app.include_router(qa_gennext.router)
    app.include_router(document.router)

    # Root endpoint
    @app.get("/")
    async def root():
        return {
            "name": "TaxGPT India API",
            "version": "1.0.0",
            "docs": "/docs",
            "health": "/api/v1/health",
        }

    # Config endpoint - returns API keys from .env
    @app.get("/api/v1/config")
    async def get_config():
        """Get configured API providers from backend .env file"""
        return {
            "gemini_key": os.getenv("GEMINI_API_KEY", ""),
            "openai_key": os.getenv("OPENAI_API_KEY", ""),
            "anthropic_key": os.getenv("ANTHROPIC_API_KEY", ""),
            "openrouter_key": os.getenv("OPENROUTER_API_KEY", ""),
            "ollama_url": os.getenv("OLLAMA_URL", "http://localhost:11434"),
            "llm_provider": os.getenv("LLM_PROVIDER", "gemini"),
        }

    return app


# Create app instance
app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
