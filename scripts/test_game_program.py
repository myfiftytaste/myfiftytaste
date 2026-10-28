"""Auto-test : python scripts/test_game_program.py (assert, aucun appel réseau ni base)."""
import datetime as dt

from game_program import load_pool, mondays, saga

assert mondays("2026-11") == [dt.date(2026, 11, d) for d in (2, 9, 16, 23, 30)], "5 lundis en novembre 2026"
assert mondays("2027-02")[0] == dt.date(2027, 2, 1)
assert saga("Harry Potter and the Order of the Phoenix") == saga("Harry Potter and the Philosopher's Stone")
assert saga("Toy Story 3") == saga("Toy Story") and saga("Drive") != saga("Dune")
pool = load_pool()
assert all(f["views"] >= 250_000 for f in pool) and not any("Documentary" in f["genres"] for f in pool)
assert not any(f["title"] == "Normal People" for f in pool), "séries écartées"
print("ok")
