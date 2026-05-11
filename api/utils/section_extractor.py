"""
Section text extractor for Income Tax Acts.

Builds a page-level index at startup and extracts section text on demand.
- 1961 Act: scanned from Income_Tax_Act_1961.pdf (880 pages)
- 2025 Act: individual section PDFs in data/pdfs/Income Tax Act 2025/
"""
import re
import json
from pathlib import Path
from functools import lru_cache
from typing import Optional

import PyPDF2

DATA_DIR = Path(__file__).parent.parent.parent / "data"
PDF_1961 = DATA_DIR / "pdfs" / "Income-tax-Act-1961.pdf"
PDF_2025_DIR = DATA_DIR / "pdfs" / "Income Tax Act 2025"
SECTIONS_1961_TEXT_PATH = DATA_DIR / "sections_1961_text.json"

# Matches section declarations like:
#   139. Return of income.
#   4[80C.  Deduction in ...
#   115BAC. Tax on income ...
#   35E. [description]
#   10(13A) [subsection variant]
# More flexible: just match number(s) + optional letters + period, without requiring specific char after
_SEC_RE = re.compile(r'\n\s*(?:\d+\[)?(\d+[A-Z]{0,3})[\.\(]')


# ─── 1961 Act ────────────────────────────────────────────────────────────────

def _get_1961_index_cache_path() -> Path:
    """Path to cached 1961 section index."""
    return DATA_DIR / "faiss_index" / "sections_1961_index.json"


@lru_cache(maxsize=1)
def _build_index_1961() -> dict[str, int]:
    """Returns {section_number: first_page_index} for the 1961 Act PDF."""
    index: dict[str, int] = {}
    if not PDF_1961.exists():
        return index

    # Try loading from cache first
    cache_path = _get_1961_index_cache_path()
    if cache_path.exists():
        try:
            with open(cache_path, encoding="utf-8") as f:
                cached = json.load(f)
            if isinstance(cached, dict) and len(cached) > 0:
                return {k: int(v) for k, v in cached.items()}
        except Exception:
            pass  # Fall through to rebuild if cache is invalid

    # Build index from PDF
    with open(PDF_1961, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for i, page in enumerate(reader.pages):
            if i < 20:  # skip table of contents
                continue
            text = page.extract_text() or ""
            for sec in _SEC_RE.findall(text):
                if sec not in index:
                    index[sec] = i

    # Save to cache for next time
    if len(index) > 0:
        try:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(index, f)
        except Exception:
            pass  # Fail silently if we can't write cache

    return index


@lru_cache(maxsize=1)
def _load_1961_text_json() -> dict[str, str]:
    """Pre-extracted 1961 section text — no PDF required at runtime."""
    if not SECTIONS_1961_TEXT_PATH.exists():
        return {}
    try:
        with open(SECTIONS_1961_TEXT_PATH, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def get_section_text_1961(section: str) -> Optional[str]:
    """
    Get the full text of a 1961 Act section.
    Primary source: data/sections_1961_text.json (pre-extracted, committed).
    Fallback: live PDF extraction (if the 177 MB PDF is present locally).
    Final fallback: title from section_mapping.json.
    """
    section = _normalise(section)

    # 1. Try pre-extracted JSON (no PDF required)
    text_json = _load_1961_text_json()
    if section in text_json:
        return text_json[section]

    # 2. Fallback to PDF extraction if PDF is present
    if not PDF_1961.exists():
        # 3. Final fallback: mapping title
        if SECTION_MAPPING_PATH.exists():
            try:
                with open(SECTION_MAPPING_PATH, encoding="utf-8") as f:
                    mapping = json.load(f)
                entry = mapping.get("old_to_new", {}).get(section.upper()) or mapping.get("old_to_new", {}).get(section)
                if entry and entry.get("title_old"):
                    return entry.get("title_old")
            except Exception:
                pass
        return None

    try:
        index = _build_index_1961()
        start_page = index.get(section)
        if start_page is None:
            return None

        # If page index is -1, it means section is in mapping but not found in PDF text extraction
        if start_page == -1:
            # Try to get text from mapping.json as fallback
            if SECTION_MAPPING_PATH.exists():
                with open(SECTION_MAPPING_PATH, encoding="utf-8") as f:
                    mapping = json.load(f)
                mapping_entry = mapping.get("old_to_new", {}).get(section.upper()) or mapping.get("old_to_new", {}).get(section)
                if mapping_entry and mapping_entry.get("title_old"):
                    return mapping_entry.get("title_old")
            return None

        # Determine the next section's page to know where to stop
        all_pages = sorted([p for p in index.values() if p > 0])
        next_pages = [p for p in all_pages if p > start_page]
        end_page = next_pages[0] if next_pages else start_page + 3
        end_page = min(end_page, start_page + 5)  # cap at 5 pages

        with open(PDF_1961, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            chunks = []
            for i in range(start_page, end_page):
                chunks.append(reader.pages[i].extract_text() or "")

        raw = "\n".join(chunks)
        return _clean_text(raw)
    except Exception:
        # If anything fails (timeout, corrupt PDF, etc.), try mapping.json fallback
        try:
            if SECTION_MAPPING_PATH.exists():
                with open(SECTION_MAPPING_PATH, encoding="utf-8") as f:
                    mapping = json.load(f)
                mapping_entry = mapping.get("old_to_new", {}).get(section.upper()) or mapping.get("old_to_new", {}).get(section)
                if mapping_entry and mapping_entry.get("title_old"):
                    return mapping_entry.get("title_old")
        except Exception:
            pass
        return None


def get_all_sections_1961() -> list[str]:
    """Return list of all old section numbers from section_mapping.json."""
    if SECTION_MAPPING_PATH.exists():
        with open(SECTION_MAPPING_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return sorted(data.get("old_to_new", {}).keys(), key=_sort_key)
    return sorted(_build_index_1961().keys(), key=_sort_key)


# ─── 2025 Act ────────────────────────────────────────────────────────────────

SECTION_MAPPING_PATH = DATA_DIR / "section_mapping.json"


@lru_cache(maxsize=1)
def _load_2025_details() -> dict[str, dict]:
    """Load 2025 section text from section_mapping.json (scraped from EasyOffice)."""
    if not SECTION_MAPPING_PATH.exists():
        return {}
    with open(SECTION_MAPPING_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("new_section_details", {})


@lru_cache(maxsize=1)
def _list_2025_section_files() -> dict[str, Path]:
    """Returns {section_number: pdf_path} for all individual section PDFs (fallback)."""
    mapping: dict[str, Path] = {}
    if not PDF_2025_DIR.exists():
        return mapping
    for path in PDF_2025_DIR.glob("Section-*_*.pdf"):
        m = re.match(r"Section-(\d+[A-Z]{0,3})_", path.name)
        if m:
            mapping[m.group(1)] = path
    return mapping


def get_section_text_2025(section: str) -> Optional[str]:
    """
    Get text of a 2025 Act section.
    Primary source: section_mapping.json (scraped, clean text).
    Fallback: individual PDF extraction.
    """
    section = _normalise(section)

    # Try JSON source first (cleaner text, no PDF artefacts)
    details = _load_2025_details()
    if section in details:
        detail = details[section]
        heading = detail.get("heading", "")
        text = detail.get("text", "")
        if text:
            # Prepend heading if not already in text
            if heading and heading not in text[:100]:
                return f"{heading}\n\n{text}"
            return text

    # Fallback: PDF extraction
    files = _list_2025_section_files()
    pdf_path = files.get(section)
    if pdf_path is None:
        return None
    with open(pdf_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        chunks = [page.extract_text() or "" for page in reader.pages]
    return _clean_text("\n".join(chunks))


def get_all_sections_2025() -> list[str]:
    """Return list of all available 2025 sections (from section_mapping.json)."""
    if SECTION_MAPPING_PATH.exists():
        with open(SECTION_MAPPING_PATH, encoding="utf-8") as f:
            data = json.load(f)
        old_to_new = data.get("old_to_new", {})
        from_json = set(_load_2025_details().keys())
        from_mapping = set()
        for entry in old_to_new.values():
            if entry.get("new_section"):
                from_mapping.add(entry["new_section"])
            for sec in entry.get("new_sections", []):
                from_mapping.add(sec)
        return sorted(from_json | from_mapping, key=_sort_key)
    from_json = set(_load_2025_details().keys())
    from_pdfs = set(_list_2025_section_files().keys())
    return sorted(from_json | from_pdfs, key=_sort_key)


# ─── Shared ───────────────────────────────────────────────────────────────────

def _normalise(sec: str) -> str:
    """Strip whitespace, remove 'Section'/'Sec' prefix, uppercase."""
    sec = sec.strip()
    sec = re.sub(r'^[Ss]ection\s*', '', sec)
    sec = re.sub(r'^[Ss]ec\.\s*', '', sec)
    return sec.upper().strip()


def _clean_text(text: str) -> str:
    """Remove PDF artefacts: page numbers, footnote markers, excess whitespace."""
    lines = text.splitlines()
    cleaned = []
    for line in lines:
        stripped = line.strip()
        # Skip bare page-number lines (e.g. "330" or "330 ")
        if re.fullmatch(r'\d{1,4}', stripped):
            continue
        # Skip lines that are only asterisks/footnote markers
        if re.fullmatch(r'[\*\d\[\] ]+', stripped):
            continue
        # Remove inline footnote markers like 1[ or 2[
        stripped = re.sub(r'\b\d{1,2}\[', '', stripped)
        # Normalise multiple spaces
        stripped = re.sub(r'  +', ' ', stripped)
        if stripped:
            cleaned.append(stripped)
    return "\n".join(cleaned).strip()


def _sort_key(sec: str):
    """Sort section numbers numerically then alphabetically, handling subsections like 10(13A)."""
    # Match: leading digits, optional letters (e.g., 80A), optional subsection in parens
    m = re.match(r'^(\d+)([A-Z]*)(?:\(([^)]+)\))?', sec)
    if m:
        main_num = int(m.group(1))
        letters = m.group(2) or ''
        subsec = m.group(3) or ''
        # Extract numeric part of subsection if present (e.g., "13" from "13A")
        subsec_match = re.match(r'(\d+)([A-Z]*)', subsec)
        if subsec_match:
            subsec_num = int(subsec_match.group(1))
            subsec_letters = subsec_match.group(2) or ''
            return (main_num, letters, subsec_num, subsec_letters)
        return (main_num, letters, 0, subsec)
    return (0, 0, 0, sec)


# ─── Warm-up ─────────────────────────────────────────────────────────────────

def warm_up():
    """Pre-build both indexes at startup so first request is fast."""
    try:
        n1961 = len(_build_index_1961())
        n2025_pdf = len(_list_2025_section_files())
        n2025_json = len(_load_2025_details())
        print(f"[OK] Section extractor: 1961={n1961} sections, 2025={n2025_json} from JSON + {n2025_pdf} from PDFs")
    except Exception as e:
        print(f"[WARN] Section extractor warm-up failed: {e}")
