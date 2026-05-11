"""Profile Analyzer: Personalized tax impact analysis by taxpayer profile"""

import os
import sys
from pathlib import Path

# Add src directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from config import GENERATION_MODEL
from prompts import (
    PROFILE_ANALYZER_SYSTEM_PROMPT,
    PROFILE_SALARIED_PROMPT,
    PROFILE_BUSINESS_PROMPT,
    PROFILE_INVESTOR_PROMPT,
    PROFILE_NRI_PROMPT,
    PROFILE_FREELANCER_PROMPT,
    GENERAL_DISCLAIMER,
)

PROFILES = {
    "salaried": {
        "label": "Salaried Employee",
        "prompt": PROFILE_SALARIED_PROMPT,
        "fallback": """**Key Changes for Salaried Employees:**

1. **HRA Exemption Expanded (Section 95)** - Now covers 8 cities: Mumbai, Delhi, Bangalore, Hyderabad, Pune, Ahmedabad, Chennai, Kolkata
2. **Standard Deduction Rs 50,000** - New in 2025 Act; available in new tax regime (Section 123)
3. **Form 130 Replaces Form 16** - TDS certificate format changed; ensures digital transition
4. **TDS Consolidated (Section 393)** - All TDS rules in one section; clearer rates and thresholds
5. **New Tax Regime Default** - Automatically applied; old regime optional if beneficial

**Action Items:**
- Verify HRA if working in expanded cities (potential refund)
- Claim standard deduction if in new tax regime
- Request Form 130 from employer; keep for filing
- Monitor advance tax deadlines: June 15, Sept 15, Dec 15, Mar 15

⚠️ DISCLAIMER: This is educational guidance. Consult your CA for personalized advice.""",
    },
    "business": {
        "label": "Business Owner",
        "prompt": PROFILE_BUSINESS_PROMPT,
        "fallback": """**Key Changes for Business Owners:**

1. **Presumptive Taxation (Section 281)** - Threshold increased for certain professions; simplified compliance
2. **TDS Consolidation (Section 393)** - All TDS rules unified; easier to track deductions
3. **Digital Asset Taxation (Section 301)** - Cryptoassets taxed at flat 30% with no deductions
4. **ITR-4S for Presumptive Income** - Simplified form available; faster filing
5. **MAT Changes** - Minimum Alternate Tax structure updated

**Action Items:**
- Review if eligible for presumptive taxation; save compliance costs
- Track all TDS received against invoice amounts
- Declare crypto holdings; plan 30% tax liability
- File ITR-4S if presumptive income eligible; much simpler
- Review advance tax schedule: June 15, Sept 15, Dec 15, Mar 15

⚠️ DISCLAIMER: This is educational guidance. Consult your CA for personalized advice.""",
    },
    "investor": {
        "label": "Investor / Trader",
        "prompt": PROFILE_INVESTOR_PROMPT,
        "fallback": """**Key Changes for Investors:**

1. **LTCG Rate (Section 299)** - Remains 20% with indexation benefit for listed shares
2. **STT Impact** - Mandatory on listed equity; affects cost base
3. **Buyback Taxation** - Clarified under new rules; different from dividend treatment
4. **Digital Asset Flat 30% (Section 301)** - Cryptoassets, NFTs taxed uniformly
5. **Holding Period Unchanged** - Equities: 12 months; other assets: 24 months

**Action Items:**
- Plan LTCG crystallization to utilize indexation
- Track STT paid; adjust cost base accordingly
- Monitor F&O tax treatment changes
- Declare crypto holdings early; plan 30% tax
- Use new tax regime if LTCG rate attractive vs old regime

⚠️ DISCLAIMER: This is educational guidance. Consult your CA for personalized advice.""",
    },
    "nri": {
        "label": "NRI / Foreign Resident",
        "prompt": PROFILE_NRI_PROMPT,
        "fallback": """**Key Changes for NRIs:**

1. **Residential Status (Section 6)** - 10-year foreign presence → full exemption eligibility
2. **Foreign Asset Disclosure** - Mandatory for Indian assets > thresholds
3. **TAN Removal** - No longer required for NRI tax compliance; simplified
4. **Form 168 (formerly 26AS)** - TCS/TDS statement; digitally available
5. **DTAA Benefits** - Continued; ensure correct form submission

**Action Items:**
- Verify residential status based on 10-year rule
- Disclose all foreign assets; penalties high for non-disclosure
- File Form 168 before ITR filing
- Claim DTAA benefits if applicable; provide treaty documents
- Consider NRI taxation if applicable (different rates apply)

⚠️ DISCLAIMER: This is educational guidance. Consult your CA for personalized advice.""",
    },
    "freelancer": {
        "label": "Freelancer / Consultant",
        "prompt": PROFILE_FREELANCER_PROMPT,
        "fallback": """**Key Changes for Freelancers:**

1. **Presumptive Taxation (Section 281)** - Available if gross income meets thresholds; simplified compliance
2. **TDS Deduction (Section 393)** - Consolidated rates; track all contractor TDS
3. **ITR-4S for Eligible Freelancers** - Much simpler form if presumptive income qualifies
4. **Advance Tax Deadlines** - June 15, Sept 15, Dec 15, Mar 15; e-payment mandatory
5. **Digital Payment Preference** - GST-registered preference for payment tracking

**Action Items:**
- Check if eligible for presumptive taxation; huge compliance savings
- File ITR-4S if eligible; avoid complex ITR-3
- Track TDS invoices from clients; set aside for advance tax
- Plan quarterly advance tax to avoid penalties
- Maintain digital payment records for GST alignment

⚠️ DISCLAIMER: This is educational guidance. Consult your CA for personalized advice.""",
    },
}


class ProfileAnalyzer:
    """Analyze tax impact by taxpayer profile"""

    def __init__(self):
        # Read key at runtime so it picks up the value set by api_config.set_env_vars()
        api_key = os.getenv("GEMINI_API_KEY", "")
        if api_key:
            from google import genai
            self.client = genai.Client(api_key=api_key)
        else:
            self.client = None
        self.profiles = PROFILES

    def analyze(self, profile_type: str) -> dict:
        """Generate personalized profile analysis"""
        if profile_type not in self.profiles:
            return {"error": True, "message": f"Unknown profile: {profile_type}"}

        profile = self.profiles[profile_type]

        # If no API key, use fallback
        if not self.client:
            return {
                "profile": profile_type,
                "label": profile["label"],
                "analysis": profile["fallback"],
                "source": "fallback",
                "error": False,
            }

        try:
            # Call Gemini with profile-specific prompt
            response = self.client.models.generate_content(
                model=GENERATION_MODEL,
                contents=[
                    {"role": "user", "parts": [{"text": PROFILE_ANALYZER_SYSTEM_PROMPT}]},
                    {"role": "user", "parts": [{"text": profile["prompt"]}]},
                ],
            )

            analysis_text = response.text + GENERAL_DISCLAIMER

            return {
                "profile": profile_type,
                "label": profile["label"],
                "analysis": analysis_text,
                "source": "gemini",
                "error": False,
            }

        except Exception as e:
            # Fall back to static analysis
            return {
                "profile": profile_type,
                "label": profile["label"],
                "analysis": profile["fallback"],
                "source": "fallback",
                "error": False,
            }

    def get_available_profiles(self) -> list:
        """Get all available profiles"""
        return [{"id": k, "label": v["label"]} for k, v in self.profiles.items()]


# Singleton instance
_profile_analyzer = None


def get_profile_analyzer():
    """Get or create ProfileAnalyzer singleton"""
    global _profile_analyzer
    if _profile_analyzer is None:
        _profile_analyzer = ProfileAnalyzer()
    return _profile_analyzer
