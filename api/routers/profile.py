"""Taxpayer profile analysis endpoints"""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from api.schemas.profile import (
    ProfileListResponse, ProfileItem, ProfileRequest, ProfileResponse, ProfileInputs,
    TaxComputationRequest, TaxComputationResponse,
)
from api.dependencies import get_api_key_config, APIKeyConfig
from api.state import get_engine
from profile_analyzer import ProfileAnalyzer
from prompts import PROFILE_QUERIES, PROFILE_RAG_SYSTEM_PROMPT, PROFILE_USER_PROMPT_TEMPLATE
from tax_calculator import compute_tax_profile

router = APIRouter(prefix="/api/v1", tags=["profile"])

_PROFILE_LABELS = {
    "salaried": "Salaried Employee",
    "business": "Business Owner / Self-Employed",
    "investor": "Investor (Equity / MF / F&O / Crypto)",
    "nri": "NRI (Non-Resident Indian)",
    "freelancer": "Freelancer / Consultant",
}


def _format_profile_inputs(inputs: ProfileInputs | None, profile_type: str) -> str:
    if not inputs:
        return "No specific financial details provided — use representative typical values."

    parts = []
    if profile_type == "salaried":
        if inputs.gross_income:
            parts.append(f"Annual gross income: ₹{inputs.gross_income} Lakhs")
        if inputs.hra_city:
            parts.append(f"HRA city type: {inputs.hra_city}")
        if inputs.tax_regime:
            parts.append(f"Tax regime preference: {inputs.tax_regime} regime")
    elif profile_type == "business":
        if inputs.turnover:
            parts.append(f"Annual turnover: ₹{inputs.turnover} Lakhs")
        if inputs.entity_type:
            parts.append(f"Entity type: {inputs.entity_type}")
    elif profile_type == "investor":
        if inputs.asset_types:
            parts.append(f"Asset types: {', '.join(inputs.asset_types)}")
        if inputs.ltcg:
            parts.append(f"Estimated LTCG: ₹{inputs.ltcg} Lakhs")
    elif profile_type == "nri":
        if inputs.residence_country:
            parts.append(f"Country of residence: {inputs.residence_country}")
        if inputs.india_income_type:
            parts.append(f"India income type: {inputs.india_income_type}")
    elif profile_type == "freelancer":
        if inputs.annual_income:
            parts.append(f"Annual income: ₹{inputs.annual_income} Lakhs")
        if inputs.main_expense:
            parts.append(f"Main expense category: {inputs.main_expense}")

    return "\n".join(parts) if parts else "No specific financial details provided — use representative typical values."


@router.get("/profiles", response_model=ProfileListResponse)
async def list_profiles() -> ProfileListResponse:
    """List all available taxpayer profiles"""
    profiles = [
        ProfileItem(id="salaried", label="Salaried Employee"),
        ProfileItem(id="business", label="Business Owner"),
        ProfileItem(id="investor", label="Investor"),
        ProfileItem(id="nri", label="NRI"),
        ProfileItem(id="freelancer", label="Freelancer"),
    ]
    return ProfileListResponse(profiles=profiles)


@router.post("/profiles/analyze", response_model=ProfileResponse)
async def analyze_profile(
    request: ProfileRequest,
    api_config: APIKeyConfig = Depends(get_api_key_config),
) -> ProfileResponse:
    """Analyze tax implications for a specific taxpayer profile (legacy endpoint)"""
    try:
        api_config.set_env_vars()
        analyzer = ProfileAnalyzer()
        result = analyzer.analyze(request.profile_type)
        return ProfileResponse(**result)
    except Exception as e:
        return ProfileResponse(
            profile=request.profile_type,
            label="Analysis Failed",
            analysis=str(e),
            source="error",
            error=True,
        )


@router.post("/profiles/analyze-stream")
async def analyze_profile_stream(
    request: ProfileRequest,
    api_config: APIKeyConfig = Depends(get_api_key_config),
):
    """RAG-grounded streaming profile analysis with personalization inputs"""
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

    profile_type = request.profile_type
    queries = PROFILE_QUERIES.get(profile_type, [])

    # Retrieve chunks for all profile-specific queries, deduplicating by text prefix
    all_chunks: list = []
    seen_ids: set = set()
    for query in queries:
        try:
            chunks = engine.retrieve(query, top_k=4)
        except Exception:
            chunks = []
        for c in chunks:
            cid = c.get("id") or c.get("text", "")[:60]
            if cid not in seen_ids:
                seen_ids.add(cid)
                all_chunks.append(c)

    all_chunks = all_chunks[:14]

    if all_chunks:
        act_context = "\n\n".join(
            f"**{c['source']}**:\n{c.get('text', '')[:1000]}" for c in all_chunks
        )
    else:
        act_context = "[No matching sections found in the index.]"

    sources = [
        {"source": c["source"], "section": c.get("section_number"), "text": c.get("text", "")}
        for c in all_chunks
    ]

    inputs_text = _format_profile_inputs(request.inputs, profile_type)
    profile_label = _PROFILE_LABELS.get(profile_type, profile_type.title())

    user_prompt = PROFILE_USER_PROMPT_TEMPLATE.format(
        profile_label=profile_label,
        inputs_text=inputs_text,
        act_context=act_context,
    )

    def event_generator():
        try:
            for text_chunk in engine.generation_provider.stream_generate(
                prompt=user_prompt,
                system_prompt=PROFILE_RAG_SYSTEM_PROMPT,
            ):
                yield f"data: {json.dumps({'chunk': text_chunk})}\n\n"
            yield f"data: {json.dumps({'sources': sources, 'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'chunk': f'Error generating analysis: {e}'})}\n\n"
            yield f"data: {json.dumps({'sources': [], 'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/profiles/compute-tax", response_model=TaxComputationResponse)
async def compute_tax(request: TaxComputationRequest) -> TaxComputationResponse:
    """Pure-math tax computation — no LLM, returns instantly (~50ms)."""
    try:
        result = compute_tax_profile(request.profile_type, request.inputs)
        return TaxComputationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tax computation failed: {e}")
