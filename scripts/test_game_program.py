"""Auto-test : python scripts/test_game_program.py (assert, aucun appel réseau ni base)."""
import datetime as dt
import re

from game_program import FAMILY_OF, default_months, mondays

assert mondays("2026-11") == [dt.date(2026, 11, d) for d in (2, 9, 16, 23, 30)], "5 lundis en novembre 2026"
assert mondays("2027-02")[0] == dt.date(2027, 2, 1)
assert re.fullmatch(r"\d{4}-\d{2}", default_months()[0])
assert FAMILY_OF[420] == "Marvel" and FAMILY_OF[3] == "Disney", "Pixar compte comme Disney"
print("ok")
