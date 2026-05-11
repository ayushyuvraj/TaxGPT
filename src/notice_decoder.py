"""Tax Notice Decoder: Parse and explain tax notices using Gemini + regex fallback"""

import os
import re
import sys
from pathlib import Path

# Add src directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from config import GENERATION_MODEL
from prompts import NOTICE_DECODER_SYSTEM_PROMPT, NOTICE_DECODER_QUERY_TEMPLATE, GENERAL_DISCLAIMER


class NoticeDecoder:
    """Decode tax notices using AI with graceful regex fallback"""

    def __init__(self):
        # Read key at runtime so it picks up the value set by api_config.set_env_vars()
        api_key = os.getenv("GEMINI_API_KEY", "")
        if api_key:
            from google import genai
            self.client = genai.Client(api_key=api_key)
        else:
            self.client = None

    def _detect_section_regex(self, text: str) -> list:
        """Regex-based section detection (fallback)"""
        # Match patterns like "Section 143(1)", "143", "270", etc.
        matches = re.findall(r"[Ss]ection\s+(\d+(?:\(\d+\))?)", text)
        return matches

    def _detect_notice_type_regex(self, text: str) -> str:
        """Regex-based notice type detection"""
        text_lower = text.lower()
        if "intimation" in text_lower or "143" in text_lower or "270" in text_lower:
            return "Intimation of Tax"
        elif "reassessment" in text_lower or "148" in text_lower or "279" in text_lower:
            return "Reassessment Notice"
        elif "penalty" in text_lower or "270" in text_lower or "271" in text_lower:
            return "Penalty Notice"
        elif "demand" in text_lower or "payable" in text_lower:
            return "Tax Demand Notice"
        else:
            return "Tax Notice (Type Unknown)"

    def _extract_dates_regex(self, text: str) -> list:
        """Extract dates from text"""
        # Match DD-MM-YYYY, DD/MM/YYYY, or month names with day/year
        date_pattern = r"(\d{1,2}[/-]\d{1,2}[/-]\d{4})"
        matches = re.findall(date_pattern, text)
        return matches

    def _estimate_severity_regex(self, text: str) -> str:
        """Estimate notice severity based on keywords"""
        text_lower = text.lower()
        high_keywords = ["penalty", "interest", "default", "prosecution", "evasion"]
        medium_keywords = ["reassessment", "demand", "clarification", "queries"]

        score = 0
        for keyword in high_keywords:
            score += text_lower.count(keyword) * 3
        for keyword in medium_keywords:
            score += text_lower.count(keyword)

        if score >= 5:
            return "High"
        elif score >= 2:
            return "Medium"
        else:
            return "Low"

    def decode_with_gemini(self, notice_text: str) -> dict:
        """Decode notice using Gemini AI"""
        if not self.client:
            return None

        try:
            prompt = NOTICE_DECODER_QUERY_TEMPLATE.format(notice_text=notice_text)
            response = self.client.models.generate_content(
                model=GENERATION_MODEL,
                contents=[
                    {"role": "user", "parts": [{"text": NOTICE_DECODER_SYSTEM_PROMPT}]},
                    {"role": "user", "parts": [{"text": prompt}]},
                ],
            )

            return {
                "analysis": response.text + GENERAL_DISCLAIMER,
                "source": "gemini",
                "error": False,
            }

        except Exception as e:
            print(f"[WARN] Gemini decode failed: {e}")
            return None

    def decode_with_regex(self, notice_text: str) -> dict:
        """Fallback: Regex-based notice decoding"""
        notice_type = self._detect_notice_type_regex(notice_text)
        sections = self._detect_section_regex(notice_text)
        dates = self._extract_dates_regex(notice_text)
        severity = self._estimate_severity_regex(notice_text)

        analysis = f"""**Notice Analysis (Regex-based Fallback)**

**Notice Type:** {notice_type}

**Detected Sections:** {", ".join(set(sections)) if sections else "No sections detected"}

**Key Dates:** {", ".join(set(dates)) if dates else "No dates found"}

**Estimated Severity:** {severity}

**What This Means:**
This appears to be a {notice_type.lower()}. Based on detected keywords and sections, it's classified as {severity.lower()} severity.

**Action Required:**
1. Read the notice carefully
2. Note all deadlines mentioned
3. Gather relevant documents
4. Consult a Chartered Accountant for proper response

**Next Steps:**
- Contact a tax professional immediately
- Do not ignore the notice
- Provide accurate information in your response
- Keep copies of all communications

⚠️ DISCLAIMER: This is a basic regex-based analysis. Consult your CA for accurate interpretation.

**Privacy Notice:** Tax notices processed by this tool are NOT shared with external services.
This is a local analysis using basic pattern matching."""

        return {
            "analysis": analysis,
            "source": "regex",
            "error": False,
            "metadata": {
                "notice_type": notice_type,
                "sections": sections,
                "dates": dates,
                "severity": severity,
            },
        }

    def decode(self, notice_text: str) -> dict:
        """Decode notice: try Gemini first, fallback to regex"""
        # Try Gemini first
        result = self.decode_with_gemini(notice_text)
        if result:
            return result

        # Fall back to regex
        return self.decode_with_regex(notice_text)


# Singleton instance
_notice_decoder = None


def get_notice_decoder():
    """Get or create NoticeDecoder singleton"""
    global _notice_decoder
    if _notice_decoder is None:
        _notice_decoder = NoticeDecoder()
    return _notice_decoder
