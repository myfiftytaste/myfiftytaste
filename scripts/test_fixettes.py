"""Auto-test : python scripts/test_fixettes.py (assert, aucun appel réseau)."""

from fixettes import compact_details, compute_fixettes


def detail(directors, cast=()):
    return compact_details({
        "vote_count": 10,
        "credits": {
            "crew": [{"id": i, "name": n, "gender": g, "job": "Director"} for i, n, g in directors],
            "cast": [{"id": i, "name": n, "gender": g, "order": o} for o, (i, n, g) in enumerate(cast)],
        },
    })


WKW, HUP, SCI = (1, "Wong Kar-wai", 2), (2, "Isabelle Huppert", 1), (3, "Céline Sciamma", 1)
films = [
    {"rss_tmdb_id": 10, "title": "A", "user_rating": 4.5},
    {"rss_tmdb_id": 11, "title": "B", "user_rating": 4.0},
    {"rss_tmdb_id": 12, "title": "C", "user_rating": 3.0},
    {"rss_tmdb_id": 13, "title": "D"},
]
details = {
    "10": detail([WKW], [HUP]),
    "11": detail([WKW], [(9, "Figurant", 2), (8, "x", 2), (7, "y", 2), (6, "z", 2), HUP]),  # 5e rôle : non compté
    "12": detail([SCI], [HUP]),
    "13": detail([(4, "Inconnu", 0)]),
}
result = compute_fixettes(films, details)

assert result["director"]["name"] == "Wong Kar-wai" and result["director"]["count"] == 2
assert result["director"]["average_rating"] == 4.25
assert result["performer"]["name"] == "Isabelle Huppert" and result["performer"]["count"] == 2, "5e rôle ignoré"
assert result["facts"]["dots"] == ["n", "n", "y", "u"], result["facts"]["dots"]
assert result["facts"]["known"] == 3 and result["facts"]["share"] == round(1 / 3, 3), "les inconnus ne comptent pas"

# Personne ne revient deux fois : pas de fixette (le site affiche « Pas de … en double »).
alone = compute_fixettes(films[2:], details)
assert alone["director"] is None and alone["performer"] is None

# Co-réalisation : une femme et un homme → le film compte.
assert compute_fixettes([{"rss_tmdb_id": 1}], {"1": detail([WKW, SCI])})["facts"]["dots"] == ["y"]
print("ok")
