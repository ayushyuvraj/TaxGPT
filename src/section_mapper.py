"""Section mapping: Old 1961 Act → New 2025 Act (JSON-first, RAG fallback)"""

import json
from pathlib import Path
from typing import Optional, Dict, List


class SectionMapper:
    """Map sections from Income Tax Act 1961 to 2025 (offline-first)"""

    def __init__(self, mapping_file: Optional[Path] = None):
        self.mapping_file = mapping_file or (Path(__file__).parent.parent / "data" / "section_mapping.json")
        self.mappings = {}
        self._load_mapping()

    def _load_mapping(self):
        """Load section mapping from JSON file"""
        if self.mapping_file.exists():
            try:
                with open(self.mapping_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.mappings = data
            except Exception as e:
                print(f"[WARN] Failed to load mapping file: {e}")
                self.mappings = {"old_to_new": {}, "concepts": {}, "forms": {}}
        else:
            self.mappings = {"old_to_new": {}, "concepts": {}, "forms": {}}

    def map_section(self, old_section: str) -> Optional[Dict]:
        """Map an old section number to new section(s)"""
        # Normalize input
        section_clean = old_section.strip().upper()
        section_clean = section_clean.replace("SECTION ", "").replace("§", "").strip()

        # Try direct lookup
        old_to_new = self.mappings.get("old_to_new", {})
        if section_clean in old_to_new:
            mapping = old_to_new[section_clean]
            return {
                "old_section": section_clean,
                "new_section": mapping.get("new_section"),
                "title_old": mapping.get("title_old"),
                "title_new": mapping.get("title_new"),
                "change_summary": mapping.get("change_summary"),
                "category": mapping.get("category"),
                "source": "json"
            }

        return None

    def get_all_mappings(self) -> Dict:
        """Get all mappings"""
        return self.mappings
