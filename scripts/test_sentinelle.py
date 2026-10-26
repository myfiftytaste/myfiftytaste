"""Auto-test : python scripts/test_sentinelle.py (assert, aucune base nécessaire : seule la règle est testée)."""

from sentinelle import MAX_ERRORS_24H, problems

assert problems(0, 0) == []
assert problems(0, MAX_ERRORS_24H) == [], "exactement le seuil : pas d'alerte (« plus de 3 »)"
assert len(problems(0, MAX_ERRORS_24H + 1)) == 1
assert len(problems(1, 0)) == 1, "un seul job bloqué suffit"
assert len(problems(2, 10)) == 2
print("OK")
