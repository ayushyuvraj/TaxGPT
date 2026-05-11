"""Profile analyzer request/response schemas"""

from pydantic import BaseModel, Field
from typing import Literal, Optional, List


class ProfileItem(BaseModel):
    """Available profile option"""
    id: str
    label: str


class ProfileListResponse(BaseModel):
    """List of available taxpayer profiles"""
    profiles: list[ProfileItem]


class ProfileInputs(BaseModel):
    """Optional personalization inputs for profile analysis"""
    # Salaried
    gross_income: Optional[int] = None      # annual gross in lakhs
    hra_city: Optional[str] = None          # "metro" | "non-metro"
    tax_regime: Optional[str] = None        # "new" | "old"
    # Business
    turnover: Optional[int] = None          # annual turnover in lakhs
    entity_type: Optional[str] = None       # "proprietor" | "company" | "llp"
    # Investor
    asset_types: Optional[List[str]] = None # equity, mf, fo, crypto
    ltcg: Optional[int] = None              # estimated LTCG in lakhs
    # NRI
    residence_country: Optional[str] = None
    india_income_type: Optional[str] = None # rental | interest | salary
    # Freelancer
    annual_income: Optional[int] = None     # in lakhs
    main_expense: Optional[str] = None


class ProfileRequest(BaseModel):
    """Request to analyze a profile"""
    profile_type: Literal["salaried", "business", "investor", "nri", "freelancer"] = Field(
        description="Type of taxpayer profile"
    )
    inputs: Optional[ProfileInputs] = None


class ProfileResponse(BaseModel):
    """Response with profile analysis"""
    profile: str
    label: str
    analysis: str
    source: str  # "gemini" or "fallback"
    error: bool = False


# ── Tax Computation schemas ────────────────────────────────────────────────────

class TaxComputationRequest(BaseModel):
    profile_type: Literal["salaried", "business", "investor", "nri", "freelancer"]
    inputs: Optional[ProfileInputs] = None


class SlabEntry(BaseModel):
    range_label: str
    rate_pct: float
    income_in_slab: int
    tax_on_slab: int


class RegimeResult(BaseModel):
    regime: str
    gross_income: int
    deductions: dict
    taxable_income: int
    slabs: List[SlabEntry]
    slab_tax: int
    rebate: int
    surcharge: int
    cess: int
    total_tax: int
    effective_rate_pct: float
    notes: List[str] = []


class SavingsOpportunity(BaseModel):
    name: str
    section: str
    description: str
    potential_saving: int
    current_utilization: int
    max_amount: int
    effort: str
    applicable: bool = True


class Deadline(BaseModel):
    date_str: str
    label: str
    detail: str
    section: str
    deadline_type: str
    days_away: int
    amount_hint: Optional[int] = None


class TaxComputationResponse(BaseModel):
    profile_type: str
    gross_income: int
    new_regime: RegimeResult
    old_regime: RegimeResult
    winner: str                        # "new" | "old"
    winner_saving: int
    savings_opportunities: List[SavingsOpportunity]
    deadlines: List[Deadline]
