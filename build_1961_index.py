#!/usr/bin/env python3
"""
Pre-build the 1961 Act section index for faster subsequent requests.
Run this once after adding the 1961 PDF to warm up the index cache.

Usage: python build_1961_index.py
"""
import sys
import re
import json
from pathlib import Path
import PyPDF2

sys.path.insert(0, str(Path(__file__).parent / "api"))
sys.path.insert(0, str(Path(__file__).parent / "src"))

from api.utils.section_extractor import _get_1961_index_cache_path

DATA_DIR = Path(__file__).parent / "data"
PDF_1961 = DATA_DIR / "pdfs" / "Income-tax-Act-1961.pdf"

_SEC_RE = re.compile(r'\n\s*(?:\d+\[)?(\d+[A-Z]{0,3})\.\s+[A-Z\[]')

print("=" * 60)
print("Building 1961 Act section index from PDF")
print("=" * 60)
print(f"PDF: {PDF_1961}")
print(f"This may take 2-5 minutes (PDF is 185MB, 1130 pages)...\n")

if not PDF_1961.exists():
    print(f"❌ ERROR: PDF not found at {PDF_1961}")
    sys.exit(1)

# Read PDF and build index with progress
index = {}
try:
    with open(PDF_1961, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        total_pages = len(reader.pages)

        for i, page in enumerate(reader.pages):
            # Skip table of contents
            if i < 20:
                continue

            # Show progress every 50 pages
            if i % 50 == 0:
                progress = (i / total_pages) * 100
                print(f"  Processing page {i:4d}/{total_pages:4d} ({progress:5.1f}%) - Found {len(index):4d} sections", end='\r')
                sys.stdout.flush()

            text = page.extract_text() or ""
            for sec in _SEC_RE.findall(text):
                if sec not in index:
                    index[sec] = i

        # Final progress line
        progress = (total_pages / total_pages) * 100
        print(f"  Processing page {total_pages:4d}/{total_pages:4d} ({progress:5.1f}%) - Found {len(index):4d} sections")

except Exception as e:
    print(f"\n❌ ERROR reading PDF: {e}")
    sys.exit(1)

# Save to cache
if len(index) > 0:
    try:
        cache_path = _get_1961_index_cache_path()
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(index, f)

        print("\n" + "=" * 60)
        print("✅ SUCCESS!")
        print("=" * 60)
        print(f"   Found {len(index)} sections")
        print(f"   Index cached at: {cache_path.relative_to(Path.cwd())}")
        print(f"\nFirst 10 sections: {sorted(list(index.keys()))[:10]}")
        print("\n✅ Compare Acts will now load 1961 sections INSTANTLY!")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ ERROR saving cache: {e}")
        sys.exit(1)
else:
    print("\n❌ FAILED - No sections found in PDF")
    print("   Check that Income-tax-Act-1961.pdf exists in data/pdfs/")
    sys.exit(1)
