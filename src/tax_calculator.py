"""
Tax computation engine — Income Tax Act 2025 (effective April 1, 2026).
Pure math, no LLM. Returns slab-by-slab breakdown for both regimes,
savings opportunities ranked by ROI, and personalised compliance deadlines.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Literal, Optional


# ── Slab tables ───────────────────────────────────────────────────────────────

# Act 2025 — Section 202  (new regime, FY 2026-27 onward)
_NEW_SLABS = [
    (0,         400_000,   0.00),
    (400_000,   800_000,   0.05),
    (800_000,   1_200_000, 0.10),
    (1_200_000, 1_600_000, 0.15),
    (1_600_000, 2_000_000, 0.20),
    (2_000_000, 2_400_000, 0.25),
    (2_400_000, None,      0.30),
]

# 1961 Act — old regime (still used for FY 2025-26 comparison for individuals < 60)
_OLD_SLABS = [
    (0,         250_000,   0.00),
    (250_000,   500_000,   0.05),
    (500_000,   1_000_000, 0.20),
    (1_000_000, None,      0.30),
]


# ── Data classes (mirrored by Pydantic schemas in api/schemas/profile.py) ─────

@dataclass
class SlabEntry:
    range_label: str
    rate_pct: float        # e.g. 5.0
    income_in_slab: int    # rupees
    tax_on_slab: int       # rupees


@dataclass
class RegimeResult:
    regime: str            # "new" | "old"
    gross_income: int
    deductions: dict       # {name: amount}
    taxable_income: int
    slabs: list[SlabEntry]
    slab_tax: int
    rebate: int            # Section 156 / 87A
    surcharge: int
    cess: int
    total_tax: int
    effective_rate_pct: float
    notes: list[str] = field(default_factory=list)


@dataclass
class SavingsOpportunity:
    name: str
    section: str
    description: str
    potential_saving: int   # rupees
    current_utilization: int
    max_amount: int
    effort: Literal["Zero", "Low", "Medium", "High"]
    applicable: bool = True


@dataclass
class Deadline:
    date_str: str          # ISO 8601
    label: str
    detail: str
    section: str
    deadline_type: Literal["filing", "payment", "investment", "transition"]
    days_away: int
    amount_hint: Optional[int] = None  # rupees, for advance-tax rows


# ── Core slab computation ─────────────────────────────────────────────────────

def _apply_slabs(taxable: int, slab_table: list) -> tuple[list[SlabEntry], int]:
    """Compute slab-wise tax. Returns (entries, total_slab_tax)."""
    entries: list[SlabEntry] = []
    total = 0
    remaining = max(taxable, 0)

    for lo, hi, rate in slab_table:
        if remaining <= 0:
            break
        slab_max = (hi - lo) if hi else remaining
        in_slab = min(remaining, slab_max)
        tax = round(in_slab * rate)

        lo_l = lo // 100_000
        hi_l = (hi // 100_000) if hi else "∞"
        label = f"₹{lo_l}L – ₹{hi_l}L" if hi else f"Above ₹{lo_l}L"

        entries.append(SlabEntry(
            range_label=label,
            rate_pct=rate * 100,
            income_in_slab=in_slab,
            tax_on_slab=tax,
        ))
        total += tax
        remaining -= in_slab

    return entries, total


def _apply_rebate_new(slab_tax: int, taxable_income: int) -> int:
    """Section 156 (Act 2025): full rebate if taxable income ≤ ₹12,00,000."""
    if taxable_income <= 1_200_000:
        return slab_tax
    # Marginal relief: cap tax so net tax never exceeds income above ₹12L
    excess_over_12l = taxable_income - 1_200_000
    if slab_tax > excess_over_12l:
        return slab_tax - (slab_tax - excess_over_12l)
    return 0


def _apply_rebate_old(slab_tax: int, taxable_income: int) -> int:
    """Section 87A (1961 Act): ₹12,500 rebate if income ≤ ₹5,00,000."""
    if taxable_income <= 500_000:
        return min(slab_tax, 12_500)
    return 0


def _surcharge(slab_tax: int, income: int) -> int:
    if income > 20_000_000:   # > ₹2Cr
        rate = 0.25
    elif income > 10_000_000: # > ₹1Cr
        rate = 0.15
    elif income > 5_000_000:  # > ₹50L
        rate = 0.10
    else:
        rate = 0.0
    return round(slab_tax * rate)


def _cess(base: int) -> int:
    """4% Health & Education Cess."""
    return round(base * 0.04)


def _effective_rate(total_tax: int, gross: int) -> float:
    if gross <= 0:
        return 0.0
    return round((total_tax / gross) * 100, 2)


# ── HRA computation ───────────────────────────────────────────────────────────

def _hra_exemption(basic_salary: int, hra_received: int, rent_paid: int, city: str) -> int:
    """Minimum of three conditions (old regime only)."""
    if rent_paid <= 0 or hra_received <= 0:
        return 0
    metro_pct = 0.50 if city == "metro" else 0.40
    conditions = [
        hra_received,
        round(basic_salary * metro_pct),
        max(0, rent_paid - round(basic_salary * 0.10)),
    ]
    return min(conditions)


# ── New Regime computation ────────────────────────────────────────────────────

def _new_regime(gross: int, profile_type: str, inputs) -> RegimeResult:
    deductions: dict = {}
    notes: list[str] = []

    # Standard deduction ₹75,000 for salaried/freelancer (Section 16 equivalent in new Act)
    std_deduction = 0
    if profile_type in ("salaried", "freelancer"):
        std_deduction = min(75_000, gross)
        deductions["Standard Deduction (§ 16)"] = std_deduction

    # Employer NPS (Section 124 — 14% of basic, not taxable in new regime)
    employer_nps = 0
    if profile_type == "salaried" and inputs and inputs.gross_income:
        basic_estimate = round(gross * 0.40)  # ~40% of gross is basic
        employer_nps = round(basic_estimate * 0.14)
        if employer_nps > 0:
            deductions["Employer NPS 14% (§ 124)"] = employer_nps
            notes.append("Employer NPS deduction assumed at 14% of estimated basic salary")

    total_deductions = sum(deductions.values())
    taxable = max(0, gross - total_deductions)

    slabs, slab_tax = _apply_slabs(taxable, _NEW_SLABS)
    rebate = _apply_rebate_new(slab_tax, taxable)
    tax_after_rebate = max(0, slab_tax - rebate)
    sc = _surcharge(tax_after_rebate, gross)
    cs = _cess(tax_after_rebate + sc)
    total = tax_after_rebate + sc + cs

    return RegimeResult(
        regime="new",
        gross_income=gross,
        deductions=deductions,
        taxable_income=taxable,
        slabs=slabs,
        slab_tax=slab_tax,
        rebate=rebate,
        surcharge=sc,
        cess=cs,
        total_tax=total,
        effective_rate_pct=_effective_rate(total, gross),
        notes=notes,
    )


# ── Old Regime computation ────────────────────────────────────────────────────

def _old_regime(gross: int, profile_type: str, inputs) -> RegimeResult:
    deductions: dict = {}
    notes: list[str] = []

    # Standard deduction ₹50,000 for salaried
    if profile_type == "salaried":
        deductions["Standard Deduction (§ 16)"] = min(50_000, gross)

    # 80C — LIC, PPF, ELSS, home loan principal (max ₹1,50,000)
    sec80c = 150_000
    deductions["80C (LIC/PPF/ELSS)"] = sec80c

    # 80D — health insurance (assumed ₹25,000)
    deductions["80D (Health Insurance)"] = 25_000

    # HRA exemption for salaried
    if profile_type == "salaried" and inputs and inputs.hra_city and inputs.gross_income:
        basic = round(gross * 0.40)
        hra_received = round(basic * 0.50)   # typical HRA = 50% of basic
        rent_paid = round(hra_received * 1.3) # assume paying more than HRA received
        hra_ex = _hra_exemption(basic, hra_received, rent_paid, inputs.hra_city)
        if hra_ex > 0:
            deductions["HRA Exemption (§ 10(13A))"] = hra_ex
            notes.append("HRA exemption estimated from typical ratios; actual depends on rent receipts")

    total_deductions = sum(deductions.values())
    taxable = max(0, gross - total_deductions)

    slabs, slab_tax = _apply_slabs(taxable, _OLD_SLABS)
    rebate = _apply_rebate_old(slab_tax, taxable)
    tax_after_rebate = max(0, slab_tax - rebate)
    sc = _surcharge(tax_after_rebate, gross)
    cs = _cess(tax_after_rebate + sc)
    total = tax_after_rebate + sc + cs

    return RegimeResult(
        regime="old",
        gross_income=gross,
        deductions=deductions,
        taxable_income=taxable,
        slabs=slabs,
        slab_tax=slab_tax,
        rebate=rebate,
        surcharge=sc,
        cess=cs,
        total_tax=total,
        effective_rate_pct=_effective_rate(total, gross),
        notes=notes,
    )


# ── Savings opportunities ─────────────────────────────────────────────────────

def _savings_salaried(gross: int, inputs, regime: str) -> list[SavingsOpportunity]:
    marginal = 0.30 if gross > 2_400_000 else (0.25 if gross > 2_000_000 else
               0.20 if gross > 1_600_000 else 0.15 if gross > 1_200_000 else
               0.10 if gross > 800_000  else 0.05 if gross > 400_000  else 0.0)

    ops: list[SavingsOpportunity] = []

    # NPS extra contribution (Section 124 / old 80CCD(1B)) — ₹50,000 additional
    nps_saving = round(50_000 * marginal * 1.04)  # include cess effect
    ops.append(SavingsOpportunity(
        name="Extra NPS Contribution (₹50K top-up)",
        section="124",
        description="Invest ₹50,000 extra in NPS for an additional deduction over 80C limit",
        potential_saving=nps_saving,
        current_utilization=0,
        max_amount=50_000,
        effort="Low",
        applicable=True,
    ))

    # HRA if not already claimed (new regime — not applicable)
    if regime == "old":
        hra_max = round(gross * 0.20)  # rough estimate
        hra_saving = round(min(hra_max, 180_000) * marginal * 1.04)
        ops.append(SavingsOpportunity(
            name="HRA Exemption (if paying rent)",
            section="63",
            description="Claim HRA exemption on rent paid — metro: 50% of basic, non-metro: 40%",
            potential_saving=hra_saving,
            current_utilization=0,
            max_amount=min(hra_max, 180_000),
            effort="Low",
            applicable=True,
        ))
    else:
        ops.append(SavingsOpportunity(
            name="HRA Exemption",
            section="63",
            description="HRA exemption is not available under the new regime (Section 202)",
            potential_saving=0,
            current_utilization=0,
            max_amount=0,
            effort="Zero",
            applicable=False,
        ))

    # Home loan interest (Section 68 in new Act — only old regime)
    if regime == "old":
        ops.append(SavingsOpportunity(
            name="Home Loan Interest Deduction",
            section="68",
            description="Deduct up to ₹2,00,000 on home loan interest for self-occupied property",
            potential_saving=round(min(200_000, gross // 10) * marginal * 1.04),
            current_utilization=0,
            max_amount=200_000,
            effort="Zero",
            applicable=True,
        ))

    # Standard deduction — already factored in, show as info
    ops.append(SavingsOpportunity(
        name="Standard Deduction (automatic)",
        section="16",
        description="₹75,000 standard deduction auto-applied for salaried — no action needed",
        potential_saving=round(75_000 * marginal * 1.04),
        current_utilization=75_000,
        max_amount=75_000,
        effort="Zero",
        applicable=True,
    ))

    return sorted(ops, key=lambda o: (0 if o.applicable else 1, -o.potential_saving))


def _savings_investor(gross: int, inputs, regime: str) -> list[SavingsOpportunity]:
    asset_types = (inputs.asset_types or []) if inputs else []
    ops: list[SavingsOpportunity] = []

    ltcg = (inputs.ltcg or 0) * 100_000 if inputs else 0

    # LTCG exemption ₹1,25,000 (Section 112A)
    ltcg_exempt = 125_000
    ltcg_saving = round(min(ltcg, ltcg_exempt) * 0.125)
    ops.append(SavingsOpportunity(
        name="LTCG Annual Exemption (₹1.25L)",
        section="112A",
        description="First ₹1,25,000 of equity LTCG is tax-free every year — use it fully",
        potential_saving=ltcg_saving,
        current_utilization=min(ltcg, ltcg_exempt),
        max_amount=ltcg_exempt,
        effort="Low",
        applicable=True,
    ))

    # Tax loss harvesting
    ops.append(SavingsOpportunity(
        name="Tax-Loss Harvesting",
        section="70",
        description="Book unrealised losses before year-end to set off against capital gains",
        potential_saving=round(ltcg * 0.10 * 0.125),
        current_utilization=0,
        max_amount=ltcg,
        effort="Medium",
        applicable=ltcg > 0,
    ))

    if "fo" in [a.lower().replace("&", "").replace(" ", "") for a in asset_types]:
        ops.append(SavingsOpportunity(
            name="F&O Loss Set-Off vs Business Income",
            section="71",
            description="F&O losses can be set off against other business income in the same year",
            potential_saving=0,
            current_utilization=0,
            max_amount=0,
            effort="Medium",
            applicable=True,
        ))

    if any("crypto" in a.lower() for a in asset_types):
        ops.append(SavingsOpportunity(
            name="Crypto / VDA — Flat 30% (no set-off allowed)",
            section="115BBH",
            description="Virtual Digital Assets taxed at 30% flat. Losses cannot be set off against any other income.",
            potential_saving=0,
            current_utilization=0,
            max_amount=0,
            effort="Zero",
            applicable=True,
        ))

    return sorted(ops, key=lambda o: (0 if o.applicable else 1, -o.potential_saving))


def _savings_nri(inputs) -> list[SavingsOpportunity]:
    return [
        SavingsOpportunity(
            name="DTAA Benefit (lower TDS rate)",
            section="307",
            description="Claim DTAA benefit to reduce TDS on interest/dividend from 30% to treaty rate (often 10–15%)",
            potential_saving=0,  # depends on actual income
            current_utilization=0,
            max_amount=0,
            effort="Low",
            applicable=True,
        ),
        SavingsOpportunity(
            name="NRE Account Interest — Fully Exempt",
            section="10(4)",
            description="Interest on NRE savings/fixed deposits is fully tax-free in India",
            potential_saving=0,
            current_utilization=0,
            max_amount=0,
            effort="Zero",
            applicable=True,
        ),
        SavingsOpportunity(
            name="RNOR Status Window (2-year transition)",
            section="6",
            description="On returning to India, foreign income stays exempt for 2–3 years under RNOR status. Plan return timing carefully.",
            potential_saving=0,
            current_utilization=0,
            max_amount=0,
            effort="Medium",
            applicable=True,
        ),
    ]


def _savings_business(gross: int, inputs) -> list[SavingsOpportunity]:
    turnover = (inputs.turnover or 0) * 100_000 if inputs else gross
    ops: list[SavingsOpportunity] = []

    # Presumptive taxation (Section 194 — 8% / 6% of turnover)
    presumptive_threshold = 30_000_000  # ₹3Cr for digital receipts
    if turnover <= presumptive_threshold:
        presumptive_profit = round(turnover * 0.08)
        actual_profit = round(turnover * 0.20)  # typical
        saving = max(0, round((actual_profit - presumptive_profit) * 0.30 * 1.04))
        ops.append(SavingsOpportunity(
            name="Presumptive Taxation (8% of turnover)",
            section="194",
            description="Declare 8% of turnover as profit (6% if digital receipts) — no books required",
            potential_saving=saving,
            current_utilization=0,
            max_amount=turnover,
            effort="Low",
            applicable=True,
        ))

    ops.append(SavingsOpportunity(
        name="Business Expense Deductions",
        section="30-43",
        description="Deduct all genuine business expenses: rent, salaries, depreciation, professional fees",
        potential_saving=0,
        current_utilization=0,
        max_amount=0,
        effort="Low",
        applicable=True,
    ))

    return ops


def _savings_freelancer(gross: int, inputs) -> list[SavingsOpportunity]:
    ops: list[SavingsOpportunity] = []

    # Presumptive for professionals (Section 194 — 50% of receipts)
    presumptive_profit = round(gross * 0.50)
    ops.append(SavingsOpportunity(
        name="Presumptive Tax (50% of receipts)",
        section="194",
        description="Declare 50% of gross receipts as income — skip detailed bookkeeping if receipts ≤ ₹75L",
        potential_saving=round(gross * 0.50 * 0.15 * 1.04),  # rough
        current_utilization=0,
        max_amount=gross,
        effort="Low",
        applicable=True,
    ))

    ops.append(SavingsOpportunity(
        name="Advance Tax Planning",
        section="211",
        description="Pay advance tax in 4 installments to avoid interest under Sections 234B/234C",
        potential_saving=0,
        current_utilization=0,
        max_amount=0,
        effort="Low",
        applicable=True,
    ))

    return ops


# ── Compliance calendar ───────────────────────────────────────────────────────

def _compliance_deadlines(profile_type: str, inputs, total_tax: int) -> list[Deadline]:
    today = date.today()
    ty = today.year  # Tax Year in progress

    def days(d: date) -> int:
        return (d - today).days

    def dl(d: date, label: str, detail: str, section: str,
           dtype: str, amount: int | None = None) -> Deadline:
        return Deadline(
            date_str=d.isoformat(),
            label=label,
            detail=detail,
            section=section,
            deadline_type=dtype,
            days_away=days(d),
            amount_hint=amount,
        )

    deadlines: list[Deadline] = []

    # Advance tax installments (Section 211)
    # 15% by Jun 15, 45% by Sep 15, 75% by Dec 15, 100% by Mar 15
    t = total_tax
    if t > 10_000:  # advance tax triggered if liability > ₹10,000
        installments = [
            (date(ty, 6, 15),  "1st Advance Tax Installment", "Pay 15% of estimated annual tax", round(t * 0.15)),
            (date(ty, 9, 15),  "2nd Advance Tax Installment", "Cumulative 45% of estimated annual tax", round(t * 0.30)),
            (date(ty, 12, 15), "3rd Advance Tax Installment", "Cumulative 75% of estimated annual tax", round(t * 0.30)),
            (date(ty + 1, 3, 15), "Final Advance Tax Installment", "Remaining 25% — avoid interest u/s 234C", round(t * 0.25)),
        ]
        for d, label, detail, amt in installments:
            deadlines.append(dl(d, label, detail, "211", "payment", amt))

    # ITR filing deadline
    needs_audit = profile_type in ("business", "investor") and (
        (inputs and inputs.turnover and inputs.turnover * 100_000 > 10_000_000) or
        (inputs and inputs.asset_types and ("fo" in [a.lower() for a in (inputs.asset_types or [])]))
    )
    itr_date = date(ty + 1, 10, 31) if needs_audit else date(ty + 1, 7, 31)
    itr_note = "Audit required — extended deadline" if needs_audit else "Standard ITR filing deadline"
    deadlines.append(dl(itr_date, "ITR Filing Deadline", itr_note, "263", "filing"))

    # Tax Year investment cutoff (for 80C / NPS etc — old regime)
    invest_cutoff = date(ty + 1, 3, 31)
    deadlines.append(dl(
        invest_cutoff,
        "Tax Year End — Investment Cutoff",
        "Last date to make tax-saving investments counting for this Tax Year",
        "123",
        "investment",
    ))

    # Act transition milestone
    act_transition = date(2026, 4, 1)
    if days(act_transition) >= 0:
        deadlines.append(dl(
            act_transition,
            "Income Tax Act 2025 Comes Into Effect",
            "New TDS section codes (§393 table), new forms (Form 130, 168), Tax Year concept begins",
            "1",
            "transition",
        ))

    # TDS credit reconciliation (Form 26AS / AIS check)
    tds_check = date(ty + 1, 6, 15)
    deadlines.append(dl(
        tds_check,
        "Check AIS / Form 168 for TDS Credits",
        "Verify all TDS deducted by employer/bank matches your records before filing ITR",
        "168",
        "filing",
    ))

    # Sort by date
    deadlines.sort(key=lambda d: d.date_str)
    return deadlines


# ── Top-level API ─────────────────────────────────────────────────────────────

def compute_tax_profile(profile_type: str, inputs) -> dict:
    """
    Main entry point called by the API router.
    Returns a dict matching TaxComputationResponse schema.
    """
    # Derive gross income from inputs
    gross = _gross_from_inputs(profile_type, inputs)

    new_r = _new_regime(gross, profile_type, inputs)
    old_r = _old_regime(gross, profile_type, inputs)

    winner = "new" if new_r.total_tax <= old_r.total_tax else "old"
    winner_saving = abs(new_r.total_tax - old_r.total_tax)

    # Savings opportunities based on winning regime
    regime_for_savings = winner
    if profile_type == "salaried":
        savings = _savings_salaried(gross, inputs, regime_for_savings)
    elif profile_type == "investor":
        savings = _savings_investor(gross, inputs, regime_for_savings)
    elif profile_type == "nri":
        savings = _savings_nri(inputs)
    elif profile_type == "business":
        savings = _savings_business(gross, inputs)
    elif profile_type == "freelancer":
        savings = _savings_freelancer(gross, inputs)
    else:
        savings = []

    deadlines = _compliance_deadlines(profile_type, inputs, new_r.total_tax)

    def regime_to_dict(r: RegimeResult) -> dict:
        return {
            "regime": r.regime,
            "gross_income": r.gross_income,
            "deductions": r.deductions,
            "taxable_income": r.taxable_income,
            "slabs": [
                {
                    "range_label": s.range_label,
                    "rate_pct": s.rate_pct,
                    "income_in_slab": s.income_in_slab,
                    "tax_on_slab": s.tax_on_slab,
                }
                for s in r.slabs if s.income_in_slab > 0
            ],
            "slab_tax": r.slab_tax,
            "rebate": r.rebate,
            "surcharge": r.surcharge,
            "cess": r.cess,
            "total_tax": r.total_tax,
            "effective_rate_pct": r.effective_rate_pct,
            "notes": r.notes,
        }

    return {
        "profile_type": profile_type,
        "gross_income": gross,
        "new_regime": regime_to_dict(new_r),
        "old_regime": regime_to_dict(old_r),
        "winner": winner,
        "winner_saving": winner_saving,
        "savings_opportunities": [
            {
                "name": s.name,
                "section": s.section,
                "description": s.description,
                "potential_saving": s.potential_saving,
                "current_utilization": s.current_utilization,
                "max_amount": s.max_amount,
                "effort": s.effort,
                "applicable": s.applicable,
            }
            for s in savings
        ],
        "deadlines": [
            {
                "date_str": d.date_str,
                "label": d.label,
                "detail": d.detail,
                "section": d.section,
                "deadline_type": d.deadline_type,
                "days_away": d.days_away,
                "amount_hint": d.amount_hint,
            }
            for d in deadlines
        ],
    }


def _gross_from_inputs(profile_type: str, inputs) -> int:
    """Derive gross income in rupees from profile inputs."""
    if not inputs:
        # Defaults by profile for demonstration
        defaults = {
            "salaried": 1_800_000,
            "business": 5_000_000,
            "investor": 1_200_000,
            "nri": 2_000_000,
            "freelancer": 1_200_000,
        }
        return defaults.get(profile_type, 1_200_000)

    lakhs_to_rupees = 100_000

    if profile_type == "salaried" and inputs.gross_income:
        return inputs.gross_income * lakhs_to_rupees
    if profile_type == "business" and inputs.turnover:
        # Approximate net profit from turnover
        profit_margin = 0.15 if getattr(inputs, "entity_type", None) == "company" else 0.25
        return round(inputs.turnover * lakhs_to_rupees * profit_margin)
    if profile_type == "investor":
        base = 1_200_000
        if inputs.ltcg:
            base += inputs.ltcg * lakhs_to_rupees
        return base
    if profile_type == "nri" and inputs.annual_income:
        return inputs.annual_income * lakhs_to_rupees
    if profile_type == "freelancer" and inputs.annual_income:
        return inputs.annual_income * lakhs_to_rupees

    defaults = {
        "salaried": 1_800_000,
        "business": 5_000_000,
        "investor": 1_200_000,
        "nri": 2_000_000,
        "freelancer": 1_200_000,
    }
    return defaults.get(profile_type, 1_200_000)
