"""Tax relevance content filtering (offline)"""

TAX_KEYWORDS = [
    "tax", "income", "section", "act", "deduction", "assessment",
    "return", "filing", "itr", "gst", "tds", "form", "fy", "ay",
    "financial", "revenue", "profit", "loss", "hra", "nps", "tcs",
    "capital gain", "rebate", "exemption", "surcharge", "cess",
]


class ContentFilter:
    def is_tax_related(self, text: str):
        """Returns (is_relevant: bool, score: float, reason: str)"""
        text_lower = text.lower()
        matches = [kw for kw in TAX_KEYWORDS if kw in text_lower]
        is_relevant = len(matches) > 0
        score = min(1.0, len(matches) * 0.2)
        reason = f"Matched keywords: {matches[:3]}" if matches else "No tax keywords found"
        return is_relevant, score, reason

    def get_rejection_response(self, question: str) -> str:
        return (
            "I can only answer questions about Indian income tax, the Income Tax Act 2025, "
            "tax deductions, forms, and related topics. Please ask a tax-related question.\n\n"
            "*Disclaimer: This is for informational purposes only and does not constitute "
            "professional tax advice.*"
        )


def get_content_filter() -> ContentFilter:
    return ContentFilter()
