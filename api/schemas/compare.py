"""Pydantic schemas for the section comparison endpoint."""
from typing import Optional
from pydantic import BaseModel


class SectionListItem(BaseModel):
    section: str
    label: str  # e.g. "80C — Deduction for life insurance..."


class SectionsListResponse(BaseModel):
    act: str  # "1961" or "2025"
    sections: list[SectionListItem]


class SectionTextResponse(BaseModel):
    act: str
    section: str
    text: Optional[str] = None
    found: bool
    error: Optional[str] = None


class CompareResponse(BaseModel):
    old_section: str
    new_section: Optional[str] = None
    old_text: Optional[str] = None
    new_text: Optional[str] = None
    old_found: bool = False
    new_found: bool = False
    mapping: Optional[dict] = None  # from section_mapping.json
    error: Optional[str] = None
