"""
Compare router: side-by-side comparison of 1961 vs 2025 Income Tax Act sections.

Endpoints:
  GET /api/v1/compare/sections/1961   - list all indexed 1961 sections
  GET /api/v1/compare/sections/2025   - list all available 2025 sections
  GET /api/v1/compare/{old_section}   - get both texts for old section + auto-mapped new section
  GET /api/v1/compare/reverse/{new_section} - get both texts starting from a 2025 section
"""
import json
import sys
from pathlib import Path
from functools import lru_cache

from fastapi import APIRouter, HTTPException, Query

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from api.schemas.compare import CompareResponse, SectionListItem, SectionsListResponse
from api.utils.section_extractor import (
    get_section_text_1961,
    get_section_text_2025,
    get_all_sections_1961,
    get_all_sections_2025,
    _normalise,
)

router = APIRouter(prefix="/api/v1/compare", tags=["compare"])

SECTION_MAPPING_PATH = Path(__file__).parent.parent.parent / "data" / "section_mapping.json"


@lru_cache(maxsize=1)
def _load_mapping() -> dict:
    if not SECTION_MAPPING_PATH.exists():
        return {}
    with open(SECTION_MAPPING_PATH, encoding="utf-8") as f:
        return json.load(f)


def _mapping_for_old(old_sec: str) -> tuple[str | None, dict | None]:
    """Return (new_section_number, mapping_dict) for an old 1961 section."""
    mapping = _load_mapping()
    old_to_new = mapping.get("old_to_new", {})
    sec_upper = old_sec.upper()
    entry = old_to_new.get(sec_upper) or old_to_new.get(old_sec)
    if not entry:
        return None, None
    new_sec = entry.get("new_section")
    return new_sec, entry


def _mapping_for_new(new_sec: str) -> tuple[str | None, dict | None]:
    """Return (old_section_number, mapping_dict) given a 2025 section."""
    mapping = _load_mapping()
    old_to_new = mapping.get("old_to_new", {})
    new_upper = new_sec.upper()
    for old_sec, entry in old_to_new.items():
        if str(entry.get("new_section", "")).upper() == new_upper:
            return old_sec, entry
    return None, None


def _build_label_1961(sec: str) -> str:
    mapping = _load_mapping()
    entry = mapping.get("old_to_new", {}).get(sec.upper())
    if entry and entry.get("title_old"):
        title = entry["title_old"][:70]
        return f"{sec} — {title}"
    return sec


def _build_label_2025(sec: str) -> str:
    mapping = _load_mapping()
    # Try new_section_details first (has heading for every 2025 section)
    details = mapping.get("new_section_details", {})
    if sec in details and details[sec].get("heading"):
        return f"{sec} — {details[sec]['heading'][:70]}"
    # Fallback: reverse lookup via old_to_new
    for old, entry in mapping.get("old_to_new", {}).items():
        if str(entry.get("new_section", "")) == sec:
            title = entry.get("title_new") or entry.get("title_old", "")
            if title:
                return f"{sec} — {title[:70]}"
    return sec


@router.get("/sections/{act}", response_model=SectionsListResponse)
async def list_sections(act: str):
    """
    List all sections available for comparison.
    act must be '1961' or '2025'.
    """
    if act == "1961":
        sections = get_all_sections_1961()
        items = [SectionListItem(section=s, label=_build_label_1961(s)) for s in sections]
        return SectionsListResponse(act="1961", sections=items)
    elif act == "2025":
        sections = get_all_sections_2025()
        items = [SectionListItem(section=s, label=_build_label_2025(s)) for s in sections]
        return SectionsListResponse(act="2025", sections=items)
    else:
        raise HTTPException(status_code=400, detail="act must be '1961' or '2025'")


@router.get("/{old_section}", response_model=CompareResponse)
async def compare_from_old(old_section: str):
    """
    Given a 1961 Act section number, return:
    - Full text of that section from the 1961 Act PDF
    - Mapped new 2025 Act section number (from section_mapping.json)
    - Full text of the new section from the 2025 Act PDFs
    - The mapping metadata (change_summary, category, etc.)
    """
    old_sec = _normalise(old_section)
    new_sec, mapping_entry = _mapping_for_old(old_sec)

    old_text = get_section_text_1961(old_sec)
    new_text = get_section_text_2025(new_sec) if new_sec else None

    return CompareResponse(
        old_section=old_sec,
        new_section=new_sec,
        old_text=old_text,
        new_text=new_text,
        old_found=old_text is not None,
        new_found=new_text is not None,
        mapping=mapping_entry,
    )


@router.get("/reverse/{new_section}", response_model=CompareResponse)
async def compare_from_new(new_section: str):
    """
    Given a 2025 Act section number, return both texts and mapping metadata.
    """
    new_sec = _normalise(new_section)
    old_sec, mapping_entry = _mapping_for_new(new_sec)

    new_text = get_section_text_2025(new_sec)
    old_text = get_section_text_1961(old_sec) if old_sec else None

    return CompareResponse(
        old_section=old_sec or "",
        new_section=new_sec,
        old_text=old_text,
        new_text=new_text,
        old_found=old_text is not None,
        new_found=new_text is not None,
        mapping=mapping_entry,
    )
