"""Recalibrage des axes mainstream et âge (backlog V3, lot 4, validé le 22/10/2026).

Mainstream : vues Letterboxd du film « du milieu » (médiane) sur tous les films,
plus seulement ceux de la Megabank. Un film absent de la Megabank voit ses vues
estimées depuis son rang parmi les films TMDB de la même année (par votes),
avec une correspondance réglée par époque sur 333 films connus des deux côtés
(corrélation 0,83-0,85, écart médian x1,5 à x1,8). Âge : âge moyen des films
plutôt qu'année moyenne, pour que les seuils ne vieillissent pas.

Crans répartis 10 / 20 / 40 / 20 / 10 % sur 26 profils réels (test du
22/10/2026, branche calib/mainstream). Activation le 1er novembre 2026 UTC
pour ne pas mélanger deux formules dans la saison d'octobre du Hall of Fame.
"""

from __future__ import annotations

import json
import math
from datetime import UTC, datetime
from pathlib import Path
from statistics import median
from typing import Any, Optional

# shortcut: date en dur, à retirer (avec l'ancien calcul) une fois novembre 2026 entamé.
ACTIVATION = datetime(2026, 11, 1, tzinfo=UTC)

# Vues Letterboxd du film du milieu : au-dessus de chaque seuil, un cran de plus.
MAINSTREAM_VIEW_CUTS = (104_080, 194_390, 321_052, 796_013)
# Âge moyen des films en années (calibré le 22/10/2026) : sous chaque seuil, un cran de plus.
AGE_CUTS = (18.8, 16.8, 13.3, 10.3)

# log10(vues) = a + b * log10(rang dans l'année), par époque de sortie.
RANK_TO_VIEWS = {"pre1980": (5.91, -0.74), "1980_99": (6.61, -0.84), "2000_14": (6.86, -0.75), "2015p": (7.17, -0.87)}

CACHE_PATH = Path(__file__).resolve().parent.parent / "data" / "cache" / "tmdb_year_rank_cache.json"


def is_active(now: Optional[datetime] = None) -> bool:
    return (now or datetime.now(UTC)) >= ACTIVATION


def era(year: int) -> str:
    if year < 1980:
        return "pre1980"
    return "1980_99" if year < 2000 else "2000_14" if year < 2015 else "2015p"


def views_from_rank(rank: int, year: int) -> float:
    a, b = RANK_TO_VIEWS[era(year)]
    return 10 ** (a + b * math.log10(rank))


def mainstream_cran(median_views: float) -> int:
    return 1 + sum(median_views > cut for cut in MAINSTREAM_VIEW_CUTS)


def age_cran(average_age: float) -> int:
    return 1 + sum(average_age < cut for cut in AGE_CUTS)


def fractional_year(now: Optional[datetime] = None) -> float:
    now = now or datetime.now(UTC)
    start = datetime(now.year, 1, 1, tzinfo=UTC)
    return now.year + (now - start).days / 365.25


def tmdb_year_rank(client: Any, tmdb_id: Any, cache: dict[str, Any]) -> Optional[tuple[int, int]]:
    """(rang dans l'année, année de sortie TMDB) ou None. Le rang vaut 1 pour le film le plus voté de son année."""
    key = str(tmdb_id)
    if key not in cache:
        detail = client.get(f"/movie/{tmdb_id}") or {}
        votes, release = detail.get("vote_count"), detail.get("release_date") or ""
        if not votes or len(release) < 4:
            return None  # échec réseau ou film sans vote : pas mis en cache, retenté à la prochaine génération
        year = int(release[:4])
        found = client.get(
            "/discover/movie",
            {"primary_release_year": year, "vote_count.gte": votes, "include_adult": "false"},
        ) or {}
        if not found.get("total_results"):
            return None
        # shortcut: cache fichier, effacé à chaque run GitHub Actions ; passer en base si les appels TMDB deviennent un coût.
        cache[key] = [int(found["total_results"]), year]
    rank, year = cache[key]
    return rank, year


def median_views(films: list[dict[str, Any]], client: Any) -> dict[str, Any]:
    """Vues du film du milieu : Megabank si connue, sinon estimation par le rang dans l'année."""
    cache: dict[str, Any] = {}
    if CACHE_PATH.exists():
        cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    logs, from_megabank, estimated = [], 0, 0
    for film in films:
        watches = film.get("watches") if film.get("has_social_stats") and film.get("source") == "megabank" else None
        if watches:
            logs.append(math.log10(float(watches)))
            from_megabank += 1
        elif client and film.get("rss_tmdb_id"):
            found = tmdb_year_rank(client, film["rss_tmdb_id"], cache)
            if found:
                logs.append(math.log10(views_from_rank(*found)))
                estimated += 1
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache), encoding="utf-8")
    return {
        "median_views": round(10 ** median(logs)) if logs else None,
        "films_counted": len(logs),
        "films_megabank": from_megabank,
        "films_estimated": estimated,
    }


if __name__ == "__main__":
    # Vérifications rapides : python scripts/mainstream_estimate.py
    assert mainstream_cran(50_000) == 1 and mainstream_cran(250_000) == 3 and mainstream_cran(2_000_000) == 5
    assert age_cran(25) == 1 and age_cran(14) == 3 and age_cran(5) == 5
    assert round(views_from_rank(2, 2026)) > round(views_from_rank(100, 2026))
    assert not is_active(datetime(2026, 10, 31, 23, 59, tzinfo=UTC)) and is_active(datetime(2026, 11, 1, tzinfo=UTC))

    class FakeClient:
        def get(self, path: str, params: Optional[dict[str, Any]] = None) -> dict[str, Any]:
            return {"total_results": 3} if "discover" in path else {"vote_count": 5000, "release_date": "2026-03-01"}

    CACHE_PATH = Path("/tmp/mainstream_estimate_selfcheck.json")  # noqa: F811 — ne touche pas au vrai cache
    result = median_views(
        [
            {"has_social_stats": True, "source": "megabank", "watches": 1_000_000},
            {"has_social_stats": False, "source": "supplemental", "rss_tmdb_id": 42},
            {"has_social_stats": False, "source": "missing"},
        ],
        FakeClient(),
    )
    assert result["films_counted"] == 2 and result["films_megabank"] == 1 and result["films_estimated"] == 1, result
    print("ok", result)
