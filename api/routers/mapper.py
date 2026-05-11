"""Section mapping endpoints"""
from fastapi import APIRouter, HTTPException
from pathlib import Path
import sys

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from api.schemas.mapper import MapperRequest, MapperResponse, MapperStatsResponse, AllMappingsResponse
from section_mapper import SectionMapper

router = APIRouter(prefix="/api/v1", tags=["mapper"])

# Initialize mapper (JSON-based, works offline)
try:
    mapper = SectionMapper()
except Exception as e:
    mapper = None
    mapper_error = str(e)


@router.post("/mapper/lookup", response_model=MapperResponse)
async def lookup_section(request: MapperRequest) -> MapperResponse:
    """Map old section/concept/form to new Act equivalent"""
    if mapper is None:
        raise HTTPException(
            status_code=500,
            detail=f"Section mapper initialization failed: {mapper_error}"
        )

    try:
        result = mapper.map_section(request.section)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mapper/stats", response_model=MapperStatsResponse)
async def get_mapper_stats() -> MapperStatsResponse:
    """Get statistics on all mappings"""
    if mapper is None:
        raise HTTPException(
            status_code=500,
            detail=f"Section mapper initialization failed: {mapper_error}"
        )

    try:
        stats = mapper.get_mapping_stats()
        return MapperStatsResponse(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mapper/all", response_model=AllMappingsResponse)
async def get_all_mappings() -> AllMappingsResponse:
    """Return full mapping data for client-side search (cached once, no per-query calls)"""
    if mapper is None:
        raise HTTPException(
            status_code=500,
            detail=f"Section mapper initialization failed: {mapper_error}"
        )

    try:
        data = mapper.get_all_mappings()
        return AllMappingsResponse(
            old_to_new=data.get("old_to_new", {}),
            concepts=data.get("concepts", {}),
            forms=data.get("forms", {}),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
