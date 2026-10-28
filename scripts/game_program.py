"""Programme de Fiftyguess : tire les films, trouve leur affiche sans texte sur TMDB, écrit game_round.

    python scripts/game_program.py 2026-11 2026-12 2027-01   # mois à programmer
    python scripts/game_program.py --titles                   # remplit seulement game_title

Règles (décisions du 28/10/2026, réglages dans data/config/fiftyguess.json) :
- une affiche par semaine (lundi → dimanche, la semaine appartient au mois de son lundi) parmi les
  films vus au moins 1,8 M de fois sur Letterboxd (Megabank) ; 1,5 M en repli pour garantir un film
  non anglophone par mois ;
- un bonus par mois (vendredi → dimanche de la dernière semaine) : 600 k à 1,8 M de vues, note ≥ 3,9,
  de préférence non anglophone ;
- jamais deux fois le même cinéaste ni la même saga ; dans un mois, pas deux fois le même genre et
  une animation au plus ; film de Noël la semaine du 25 décembre ;
- affiche TMDB « sans langue » ; si tesseract est installé, une affiche où il lit des mots est
  écartée ; sans affiche propre, le film est remplacé par un autre.
Relançable : une date déjà programmée n'est jamais modifiée (ON CONFLICT DO NOTHING).
"""
from __future__ import annotations

import ast
import csv
import datetime as dt
import json
import random
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Optional

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hall_of_fame_common import connect  # noqa: E402
from recommendation_candidates_tmdb import get_tmdb_client  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG = json.loads((BASE_DIR / "data" / "config" / "fiftyguess.json").read_text(encoding="utf-8"))
MEGABANK = BASE_DIR / "data" / "processed" / "megabank_clean.csv"
EXCLUDED_GENRES = {"Documentary", "Music", "TV Movie"}
POSTER_BASE = "https://image.tmdb.org/t/p/w780"
SAGAS = ("harry potter", "the lord of the rings", "star wars", "toy story", "pirates of the caribbean", "the hunger games",
         "spider-man", "avengers", "the twilight saga", "kill bill", "back to the future", "shrek", "dune", "the godfather",
         "john wick", "mad max", "jurassic", "indiana jones", "the matrix", "despicable me", "frozen")


def load_pool() -> list[dict[str, Any]]:
    pool = []
    with MEGABANK.open(encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            views = int(float(row["watches"] or 0))
            genres = ast.literal_eval(row["genres"] or "[]")
            if views < 250_000 or set(genres) & EXCLUDED_GENRES or row["title"] in CONFIG["series"]:
                continue
            pool.append({
                "title": row["title"], "slug": row["letterboxd_slug"], "views": views,
                "rating": float(row["average_rating"] or 0), "directors": ast.literal_eval(row["directors"] or "[]"),
                "genres": genres, "lang": row["original_language"],
            })
    return sorted(pool, key=lambda film: -film["views"])


def saga(title: str) -> str:
    lower = title.lower()
    for name in SAGAS:
        if lower.startswith(name) or name in lower:
            return name
    return re.sub(r"\s+(\d+|ii|iii|iv)$", "", re.split(r"[:\-–]", lower)[0].strip())


def text_on_poster(url: str) -> bool:
    """True si tesseract lit au moins deux mots sur l'affiche. Sans tesseract : False (pas de contrôle)."""
    if not shutil.which("tesseract"):
        return False
    with tempfile.NamedTemporaryFile(suffix=".jpg") as image:
        image.write(requests.get(url.replace("/w780/", "/w342/"), timeout=20).content)
        image.flush()
        text = subprocess.run(["tesseract", image.name, "stdout"], capture_output=True, text=True, timeout=60).stdout
    return len(re.findall(r"[A-Za-zÀ-ÿ]{3,}", text)) >= 2


def tmdb_film(client, film: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Fiche TMDB du film (le résultat dont la réalisation correspond), avec son affiche sans texte."""
    search = client.get("/search/movie", {"query": film["title"], "language": "fr-FR"}) or {}
    for hit in (search.get("results") or [])[:5]:
        detail = client.get(
            f"/movie/{hit['id']}",
            {"language": "fr-FR", "append_to_response": "credits,images,alternative_titles", "include_image_language": "null"},
        ) or {}
        directors = [p["name"] for p in (detail.get("credits") or {}).get("crew") or [] if p.get("job") == "Director"]
        if film["directors"] and not set(directors) & set(film["directors"]):
            continue
        posters = sorted(
            (p for p in (detail.get("images") or {}).get("posters") or [] if p.get("iso_639_1") is None),
            key=lambda p: (-(p.get("vote_average") or 0), -(p.get("vote_count") or 0)),
        )
        poster = next((POSTER_BASE + p["file_path"] for p in posters[:4] if not text_on_poster(POSTER_BASE + p["file_path"])), None)
        if not poster:
            print(f"  pas d'affiche sans texte pour {film['title']}, film suivant")
            return None
        fr_alts = [t["title"] for t in (detail.get("alternative_titles") or {}).get("titles") or [] if t.get("iso_3166_1") in ("FR", "BE", "CA")]
        return {
            "tmdb_id": detail["id"], "title_fr": detail.get("title") or film["title"], "title_orig": film["title"],
            "aliases": sorted({detail.get("original_title") or "", *fr_alts} - {"", detail.get("title"), film["title"]}),
            "year": int(detail["release_date"][:4]) if detail.get("release_date") else None,
            "director": ", ".join(directors[:2]) or None, "poster_url": poster,
        }
    return None


def mondays(month: str) -> list[dt.date]:
    year, number = map(int, month.split("-"))
    day = dt.date(year, number, 1)
    day += dt.timedelta(days=(7 - day.weekday()) % 7)
    out = []
    while day.month == number:
        out.append(day)
        day += dt.timedelta(days=7)
    return out


def program(months: list[str]) -> None:
    client = get_tmdb_client()
    if client is None:
        raise SystemExit("TMDB_API_KEY manquante.")
    pool = [f for f in load_pool() if f["title"] not in CONFIG["exclude"]]
    rng = random.Random(CONFIG["seed"])
    conn = connect()
    taken = conn.execute("SELECT title_orig, director, kind, to_char(opens_on, 'YYYY-MM-DD') AS opens FROM game_round").fetchall()
    used_titles = {row["title_orig"] for row in taken}
    used_directors = {d.strip() for row in taken for d in (row["director"] or "").split(",")}
    used_sagas = {saga(row["title_orig"]) for row in taken}
    scheduled = {(row["kind"], row["opens"]) for row in taken}

    def free(film):
        return film["title"] not in used_titles and not set(film["directors"]) & used_directors and saga(film["title"]) not in used_sagas

    def weighted(cands):
        point = rng.uniform(0, sum(f["views"] for f in cands))
        for film in cands:
            point -= film["views"]
            if point <= 0:
                return film
        return cands[-1]

    def place(kind, opens, closes, month, cands):
        """Tire jusqu'à trouver un film qui a une affiche sans texte, puis l'écrit."""
        while cands:
            film = cands[0] if len(cands) == 1 else weighted(cands)
            cands = [f for f in cands if f is not film]
            info = tmdb_film(client, film)
            if not info:
                continue
            focus_x, focus_y = rng.uniform(0.15, 0.85), rng.uniform(0.15, 0.85)
            conn.execute(
                """INSERT INTO game_round (kind, opens_on, closes_on, month, tmdb_id, title_fr, title_orig, aliases, year,
                       director, letterboxd_slug, poster_url, focus_x, focus_y)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (kind, opens_on) DO NOTHING""",
                (kind, opens, closes, month, info["tmdb_id"], info["title_fr"], info["title_orig"], info["aliases"], info["year"],
                 info["director"], film["slug"], info["poster_url"], focus_x, focus_y),
            )
            used_titles.add(film["title"])
            used_directors.update(film["directors"])
            used_sagas.add(saga(film["title"]))
            print(f"{kind} {opens} : {info['title_fr']} ({film['title']})")
            return film
        print(f"{kind} {opens} : aucun film trouvé")
        return None

    for month in months:
        weeks = mondays(month)
        genres, animation, foreign = set(), 0, 0
        for index, monday in enumerate(weeks):
            if ("week", monday.isoformat()) in scheduled:
                continue
            need_foreign = foreign == 0 and index == len(weeks) - 1

            def ok(f, floor, check_genre=True):
                return (f["views"] >= floor and free(f)
                        and (not check_genre or (f["genres"] or ["?"])[0] not in genres)
                        and not (animation and "Animation" in f["genres"])
                        and (not need_foreign or f["lang"] != "English"))

            pinned = CONFIG["pinned"].get(f"week {monday.isoformat()}")
            christmas = monday.month == 12 and monday.day <= 25 <= monday.day + 6
            cands = (
                [f for f in pool if f["title"] == pinned]
                or ([f for f in pool if christmas and f["title"] in CONFIG["christmas"] and ok(f, CONFIG["week_min_views"], False)])
                or [f for f in pool if ok(f, CONFIG["week_min_views"])]
                or [f for f in pool if ok(f, CONFIG["week_min_views"], False)]
                or [f for f in pool if ok(f, CONFIG["week_min_views_fallback"], False)]
            )
            film = place("week", monday, monday + dt.timedelta(days=6), month, cands)
            if film:
                genres.add((film["genres"] or ["?"])[0])
                animation += "Animation" in film["genres"]
                foreign += film["lang"] != "English"
        friday = weeks[-1] + dt.timedelta(days=4)
        if ("bonus", friday.isoformat()) not in scheduled:
            pinned = CONFIG["pinned"].get(f"bonus {month}")
            bonus = [f for f in pool if CONFIG["bonus_min_views"] <= f["views"] < CONFIG["week_min_views"]
                     and f["rating"] >= CONFIG["bonus_min_rating"] and free(f)]
            cands = [f for f in pool if f["title"] == pinned] or [f for f in bonus if f["lang"] != "English"] or bonus
            place("bonus", friday, friday + dt.timedelta(days=2), month, cands)
    conn.close()


def titles() -> None:
    """Titres de la saisie assistée : les films vus plus de 600 k fois, en anglais et en français."""
    client = get_tmdb_client()
    names = set()
    for film in [f for f in load_pool() if f["views"] >= 600_000]:
        names.add(film["title"])
        hits = ((client.get("/search/movie", {"query": film["title"], "language": "fr-FR"}) or {}).get("results") or []) if client else []
        if hits and hits[0].get("title"):
            names.add(hits[0]["title"])
    conn = connect()
    names.update(row["title_fr"] for row in conn.execute("SELECT title_fr FROM game_round").fetchall())
    with conn.cursor() as cursor:
        cursor.executemany("INSERT INTO game_title (title) VALUES (%s) ON CONFLICT DO NOTHING", [(name,) for name in sorted(names)])
    conn.close()
    print(f"{len(names)} titres")


def next_months(count: int = 2) -> list[str]:
    """Les mois qui suivent le mois en cours (programmation automatique, deux mois d'avance)."""
    today = dt.date.today().replace(day=1)
    out = []
    for _ in range(count):
        today = (today + dt.timedelta(days=32)).replace(day=1)
        out.append(today.strftime("%Y-%m"))
    return out


if __name__ == "__main__":
    args = sys.argv[1:]
    if args != ["--titles"]:
        program([a for a in args if re.fullmatch(r"\d{4}-\d{2}", a)] or next_months())
    titles()
