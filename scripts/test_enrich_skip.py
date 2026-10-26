"""Auto-test : python scripts/test_enrich_skip.py (assert, rien d'autre à installer)."""

from enrich_missing_with_tmdb import should_skip

manual = {"status": "confirmed", "metadata_source": "manual_correction"}
tmdb = {"status": "confirmed", "metadata_source": "tmdb"}

assert should_skip(manual, force=True), "correction manuelle écrasée par --force"
assert should_skip(manual, force=False)
assert should_skip(tmdb, force=False)
assert not should_skip(tmdb, force=True), "--force doit toujours refaire une fiche TMDB"
assert not should_skip(None, force=False)
print("OK")
