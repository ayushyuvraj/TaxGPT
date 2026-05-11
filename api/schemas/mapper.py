"""Section mapper request/response schemas"""

from pydantic import BaseModel, Field
from typing import Any, Dict, Optional, Literal, Union


class MapperRequest(BaseModel):
    """Request to map an old section to new"""
    section: str = Field(min_length=1, description="Old section number, form, or concept")


class SectionResult(BaseModel):
    """Successful section mapping result"""
    found: bool = True
    type: Literal["section"] = "section"
    old_section: str
    new_section: str
    title_old: str
    title_new: str
    change_summary: str
    category: str


class ConceptResult(BaseModel):
    """Successful concept mapping result"""
    found: bool = True
    type: Literal["concept"] = "concept"
    old_concept: str
    new_concept: str
    new_section: str
    change_summary: str
    impact: str


class FormResult(BaseModel):
    """Successful form mapping result"""
    found: bool = True
    type: Literal["form"] = "form"
    old_form: str
    new_form: str
    purpose: str
    status: str


class NotFoundResult(BaseModel):
    """Section not found result"""
    found: bool = False
    old_section: str


# Union of all possible results
MapperResponse = Union[SectionResult, ConceptResult, FormResult, NotFoundResult]


class MapperStatsResponse(BaseModel):
    """Statistics on all mappings"""
    total_old_to_new: int
    total_concepts: int
    total_forms: int


class AllMappingsResponse(BaseModel):
    """Full mapping data for client-side search"""
    old_to_new: Dict[str, Any]
    concepts: Dict[str, Any]
    forms: Dict[str, Any]
