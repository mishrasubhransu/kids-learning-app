#!/usr/bin/env python3
"""One-off backfill of toddlearn's existing generated images into genlab
(/mnt/data/genlab). Prompts are reconstructed from the generator's own
STYLE_PROMPTS/ITEMS tables; provider/model are left unset because they were
not tracked at generation time. Safe to re-run (dedups on image+prompt, and
skips files already archived for the same project/item).

Usage: python scripts/backfill_genlab.py
"""

import os
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, "/mnt/data/genlab")
import genlab

# The generator builds a Gemini client at import time; give it a placeholder
# key so importing its prompt tables works without credentials.
os.environ.setdefault("GOOGLE_API_KEY", "unused-for-backfill")
sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_object_images import ITEMS, STYLE_PROMPTS, get_output_dir

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKFILL_NOTE = "backfilled 2026-07-23; provider/model not tracked at generation time"


def already_archived(con, sha, item):
    return con.execute(
        "SELECT 1 FROM entries WHERE sha256=? AND project='toddlearn' AND ifnull(item,'')=?",
        (sha, item),
    ).fetchone() is not None


def main():
    con = sqlite3.connect("/mnt/data/genlab/genlab.db")
    recorded = skipped = orphans = 0
    seen_files = set()

    for category, items in ITEMS.items():
        out_dir = Path(get_output_dir(category))
        style = STYLE_PROMPTS.get(category, STYLE_PROMPTS["animals"])
        for item, subject in items.items():
            path = out_dir / f"{item}.webp"
            if not path.exists():
                continue
            seen_files.add(path.resolve())
            if already_archived(con, genlab._sha256(path), item):
                skipped += 1
                continue
            genlab.record(path, prompt=style.format(subject=subject),
                          project="toddlearn", category=category, item=item,
                          status="accepted", notes=BACKFILL_NOTE)
            recorded += 1
        # Files in the category dir that no longer match an ITEMS entry
        for path in out_dir.glob("*.webp"):
            if path.resolve() in seen_files:
                continue
            seen_files.add(path.resolve())
            genlab.record(path, project="toddlearn", category=category,
                          item=path.stem, status="accepted",
                          notes=BACKFILL_NOTE + "; not in current ITEMS, prompt unknown")
            orphans += 1

    # public/backup/ holds pre-refresh versions that were superseded
    backup_root = PROJECT_ROOT / "public" / "backup"
    for path in sorted(backup_root.rglob("*.webp")):
        rel_cat = str(path.parent.relative_to(backup_root)).replace(os.sep, "-")
        genlab.record(path, project="toddlearn", category=rel_cat,
                      item=path.stem, status="superseded",
                      notes=BACKFILL_NOTE + "; from public/backup (pre-refresh version)")
        orphans += 1

    con.close()
    print(f"Backfill done: {recorded} recorded with prompts, {orphans} without prompts, "
          f"{skipped} already archived")


if __name__ == "__main__":
    main()
