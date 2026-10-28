"""Auto-test : python scripts/test_worker_redact.py (assert, rien d'autre à installer)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from worker import redact

assert redact("Wrote data/output/Bob_wrapped.json pour BOB", "bob") == "Wrote data/output/<pseudo>_wrapped.json pour <pseudo>"
assert redact("RSS fetch failed (404) for https://letterboxd.com/bob/rss/", "bob", "Bob") == (
    "RSS fetch failed (404) for https://letterboxd.com/<pseudo>/rss/"
)
assert redact("rien à masquer", "bob") == "rien à masquer"
assert redact("texte", None, "") == "texte"
print("OK")
