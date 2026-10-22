"""Test du recalibrage mainstreamness (backlog V3, lot 4) — n'écrit rien en base.

Pour chaque pseudo : 50 derniers films du flux RSS, vues Letterboxd quand le
film est dans la Megabank (appariement par slug), sinon vues estimées depuis
le nombre de votes TMDB (tmdb:movieId du flux). Compare le calcul actuel
(moyenne des scores bornés à 1 M de vues, sur les seuls films Megabank) au
calcul proposé (médiane des log-vues sur tous les films, crans par quintiles).

Usage : python scripts/calibrage_mainstream.py pseudo1 pseudo2 ...
Sortie : data/audit/calibrage_mainstream.csv (profils) et calibrage_mainstream_films.csv
"""

from __future__ import annotations

import csv
import json
import math
import os
import statistics as st
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_profile_metrics import niche_score_for_watches  # noqa: E402
from build_user_wrapped import fetch_rss  # noqa: E402

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / "data" / "audit"

# Conversion votes TMDB -> vues Letterboxd, ajustée le 22/10/2026 sur 675 films
# présents dans la Megabank et dans le cache TMDB (corrélation des logs 0,925).
# A : une seule droite. B : même pente, constante par époque de sortie
# (2023+ ne repose que sur 6 films : variante de sensibilité, pas de référence).
CONV_A = (1.34, 1.17)
CONV_B_SLOPE = 1.197
CONV_B_INTERCEPT = {"pre2000": 1.337, "2000_14": 1.163, "2015_22": 1.265, "2023p": 1.834}
OLD_CUTS = (45, 65, 80, 92)  # seuils actuels de build_profile_metrics.py


def era(year: int | None) -> str:
    if not year or year < 2000:
        return "pre2000"
    return "2000_14" if year < 2015 else "2015_22" if year < 2023 else "2023p"


def old_cran(pct: float) -> int:
    return 1 + sum(pct > cut for cut in OLD_CUTS)


def quintile_cuts(values: list[float]) -> list[float]:
    s = sorted(values)
    return [s[round(len(s) * k) - 1] for k in (0.2, 0.4, 0.6, 0.8)]


def cran(value: float, cuts: list[float]) -> int:
    return 1 + sum(value > cut for cut in cuts)


def main() -> None:
    usernames = sys.argv[1:]
    key = os.environ["TMDB_API_KEY"]
    megabank = {
        f["letterboxd_slug"]: float(f["watches"])
        for f in json.loads((BASE / "data/processed/megabank_clean.json").read_text(encoding="utf-8"))
        if f.get("letterboxd_slug") and f.get("watches")
    }
    tmdb: dict[str, tuple[int | None, int | None]] = {}
    profiles, film_rows = [], []

    for username in usernames:
        try:
            feed = fetch_rss(username)
        except Exception as error:  # profil supprimé/privé : on le signale et on continue
            print(f"{username}: RSS indisponible ({error})", file=sys.stderr)
            continue
        films = []
        for entry in feed.entries:
            title = entry.get("letterboxd_filmtitle")
            if not title:
                continue  # listes, pas des visionnages
            slug = (entry.get("link") or "").split("/film/")[-1].split("/")[0]
            tmdb_id = entry.get("tmdb_movieid")
            if tmdb_id and tmdb_id not in tmdb:
                r = requests.get(f"https://api.themoviedb.org/3/movie/{tmdb_id}", params={"api_key": key}, timeout=10)
                data = r.json() if r.ok else {}
                tmdb[tmdb_id] = (data.get("vote_count"), int(data["release_date"][:4]) if data.get("release_date") else None)
            votes, tmdb_year = tmdb.get(tmdb_id, (None, None)) if tmdb_id else (None, None)
            year = int(entry.get("letterboxd_filmyear") or 0) or tmdb_year
            watches = megabank.get(slug)
            est_a = est_b = None
            if watches is None and votes:
                lv = math.log10(votes)
                est_a = 10 ** (CONV_A[0] + CONV_A[1] * lv)
                est_b = 10 ** (CONV_B_INTERCEPT[era(year)] + CONV_B_SLOPE * lv)
            films.append((title, year, watches, votes, est_a, est_b))
            film_rows.append([username, title, year, watches or "", votes or "", round(est_a or 0) or "", round(est_b or 0) or ""])

        lb = [w for _, _, w, _, _, _ in films if w]
        log_a = [math.log10(w or ea) for _, _, w, _, ea, _ in films if w or ea]
        log_b = [math.log10(w or eb) for _, _, w, _, _, eb in films if w or eb]
        old_pct = 100 - st.mean(niche_score_for_watches(w) for w in lb) if lb else None
        profiles.append({
            "username": username,
            "films": len(films),
            "films_megabank": len(lb),
            "films_estimes": len(log_a) - len(lb),
            "recents_2023p": sum(1 for f in films if (f[1] or 0) >= 2023),
            "ancien_pct": round(old_pct, 1) if old_pct is not None else None,
            "ancien_cran": old_cran(old_pct) if old_pct is not None else None,
            "vues_medianes_A": round(10 ** st.median(log_a)) if log_a else None,
            "vues_medianes_B": round(10 ** st.median(log_b)) if log_b else None,
        })

    ref = [p for p in profiles if p["films"] >= 20 and p["vues_medianes_A"]]
    for variant in ("A", "B"):
        values = [math.log10(p[f"vues_medianes_{variant}"]) for p in ref]
        cuts = quintile_cuts(values)
        for p in profiles:
            v = p[f"vues_medianes_{variant}"]
            p[f"cran_{variant}"] = cran(math.log10(v), cuts) if v else None
            p[f"plus_mainstream_que_{variant}_pct"] = round(100 * sum(x < math.log10(v) for x in values) / len(values)) if v else None
        print(f"seuils {variant} (vues médianes) : {[round(10 ** c) for c in cuts]}")

    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / "calibrage_mainstream.csv", "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(profiles[0].keys()))
        writer.writeheader()
        writer.writerows(sorted(profiles, key=lambda p: -(p["vues_medianes_A"] or 0)))
    with open(OUT / "calibrage_mainstream_films.csv", "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["username", "titre", "annee", "vues_letterboxd", "votes_tmdb", "vues_estimees_A", "vues_estimees_B"])
        writer.writerows(film_rows)
    print(f"{len(profiles)} profils, {len(tmdb)} films TMDB interrogés")


if __name__ == "__main__":
    main()
