#!/usr/bin/env python3
"""
One-time extraction: read all 1961 Act section text from the PDF
into a committed JSON file (data/sections_1961_text.json).

After running this, get_section_text_1961() can serve answers WITHOUT
needing the 177 MB PDF at runtime — same pattern 2025 sections already use.

Run once:
    python extract_1961_sections.py
"""
import json
import re
import sys
import time
from pathlib import Path

import PyPDF2

ROOT = Path(__file__).parent
PDF_1961 = ROOT / "data" / "pdfs" / "Income-tax-Act-1961.pdf"
INDEX_CACHE = ROOT / "data" / "faiss_index" / "sections_1961_index.json"
OUTPUT = ROOT / "data" / "sections_1961_text.json"

MAX_PAGES_PER_SECTION = 5  # safety cap (same as runtime extractor)


def _clean_text(text: str) -> str:
    """Same cleaner as api/utils/section_extractor.py — drop bare page numbers."""
    lines = text.splitlines()
    cleaned = []
    for line in lines:
        if re.fullmatch(r"\d{1,4}", line.strip()):
            continue
        cleaned.append(line)
    return "\n".join(cleaned).strip()


def main():
    if not PDF_1961.exists():
        print(f"[ERROR] PDF not found: {PDF_1961}")
        sys.exit(1)
    if not INDEX_CACHE.exists():
        print(f"[ERROR] Page-index cache not found: {INDEX_CACHE}")
        sys.exit(1)

    print(f"Loading page-index cache from {INDEX_CACHE.name}...")
    with open(INDEX_CACHE, encoding="utf-8") as f:
        section_to_start_page = {k: int(v) for k, v in json.load(f).items() if int(v) >= 0}
    print(f"  {len(section_to_start_page)} sections indexed")

    sorted_pages = sorted(set(section_to_start_page.values()))

    print(f"Opening PDF ({PDF_1961.stat().st_size // (1024*1024)} MB)...")
    t0 = time.time()
    with open(PDF_1961, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        total_pages = len(reader.pages)
        print(f"  {total_pages} pages")

        print("Extracting text from all pages (this takes ~1-2 min)...")
        page_texts: list[str] = []
        for i, page in enumerate(reader.pages):
            try:
                page_texts.append(page.extract_text() or "")
            except Exception:
                page_texts.append("")
            if (i + 1) % 100 == 0:
                print(f"  page {i+1}/{total_pages} ({(i+1)*100//total_pages}%)")
    print(f"Done in {time.time() - t0:.1f}s")

    print(f"\nSlicing text per section...")
    output: dict[str, str] = {}
    for sec, start_page in section_to_start_page.items():
        next_pages = [p for p in sorted_pages if p > start_page]
        end_page = next_pages[0] if next_pages else start_page + MAX_PAGES_PER_SECTION
        end_page = min(end_page, start_page + MAX_PAGES_PER_SECTION, total_pages)
        raw = "\n".join(page_texts[start_page:end_page])
        cleaned = _clean_text(raw)
        if cleaned:
            output[sec] = cleaned

    print(f"  {len(output)} sections with non-empty text")

    print(f"\nWriting {OUTPUT}...")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=0)

    size_mb = OUTPUT.stat().st_size / (1024 * 1024)
    avg_chars = sum(len(v) for v in output.values()) / max(1, len(output))
    print(f"  {OUTPUT.stat().st_size:,} bytes ({size_mb:.1f} MB)")
    print(f"  avg {avg_chars:.0f} chars per section")
    print(f"\nDone. Commit {OUTPUT.relative_to(ROOT)} to git.")


if __name__ == "__main__":
    main()
