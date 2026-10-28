"""Programme de Fiftyguess (méthode du 28/10/2026) : propose les affiches des mois à venir.

    python scripts/game_program.py 2026-11 2026-12 2027-01   # mois à programmer (défaut : dans 3 mois)
    python scripts/game_program.py --essai 2026-11           # affiche le programme, n'écrit rien

1. Vivier : les films les plus votés de TMDB (sans aucun lien avec la Megabank).
2. Notoriété en France : consultations de la page Wikipédia en français sur 12 mois. Titres des pages
   trouvés en une requête Wikidata (propriété P4947 = identifiant TMDB), consultations gardées un an
   dans game_fame. Semaine : les `week_top` films les plus consultés ; bonus : jusqu'à `bonus_top`,
   note TMDB ≥ `bonus_min_rating`.
3. Pas de suites : un film d'une collection TMDB n'est pris que s'il en est le premier.
4. Variété : une famille de studio (Marvel, Disney…) au plus une fois tous les `family_gap_days`
   jours ; un cinéaste une seule fois ; dans un mois, une animation au plus, au moins un film non
   anglophone et un film d'avant 2000, pas deux fois le même genre, pas deux semaines de suite dans
   la même décennie. Film de Noël la semaine du 25 décembre. Les règles se relâchent une à une,
   dans un ordre fixe, et le journal le dit.
5. Affiche TMDB « sans langue » ; tesseract écarte celles où il lit du texte ; à défaut, la mieux
   notée est gardée et signalée « à vérifier ».
6. Les films sont écrits « proposés » : ils n'ouvrent qu'une fois validés dans les coulisses.
Relançable : seules les cases vides sont remplies ; les films de game_excluded ne reviennent jamais.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Optional

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hall_of_fame_common import connect  # noqa: E402
from recommendation_candidates_tmdb import get_tmdb_client  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG = json.loads((BASE_DIR / "data" / "config" / "fiftyguess.json").read_text(encoding="utf-8"))
POSTER_BASE = "https://image.tmdb.org/t/p/w780"
ANIMATION, DOCUMENTARY = 16, 99
HEADERS = {"User-Agent": "Fifty/1.0 (https://50films.fr; contact@50films.fr)"}
FAMILY_OF = {company: family for family, ids in CONFIG["families"].items() for company in ids}
LOG: list[str] = []


def log(line: str) -> None:
    LOG.append(line)
    print(line, flush=True)


# ---------- 1. Vivier TMDB ----------
def tmdb_pool(client) -> list[dict[str, Any]]:
    films = []
    for page in range(1, CONFIG["tmdb_pages"] + 1):
        data = client.get("/discover/movie", {"sort_by": "vote_count.desc", "language": "fr-FR", "page": page}) or {}
        for film in data.get("results") or []:
            if DOCUMENTARY in (film.get("genre_ids") or []) or not film.get("release_date"):
                continue
            films.append({
                "id": film["id"], "title_fr": film.get("title") or film.get("original_title"),
                "original_title": film.get("original_title"), "lang": film.get("original_language"),
                "year": int(film["release_date"][:4]), "genres": film.get("genre_ids") or [],
                "rating": film.get("vote_average") or 0, "votes": film.get("vote_count") or 0,
            })
    return films


# ---------- 2. Notoriété en France (Wikipédia) ----------
def frwiki_titles(ids: list[int]) -> dict[int, str]:
    """Titre de la page Wikipédia en français de chaque film, en une requête Wikidata."""
    values = " ".join(f'"{i}"' for i in ids)
    query = f"""SELECT ?tmdb ?article WHERE {{
      VALUES ?tmdb {{ {values} }} ?item wdt:P4947 ?tmdb .
      ?article schema:about ?item ; schema:isPartOf <https://fr.wikipedia.org/> . }}"""
    response = requests.post("https://query.wikidata.org/sparql", data={"query": query, "format": "json"}, headers=HEADERS, timeout=90)
    response.raise_for_status()
    out = {}
    for row in response.json()["results"]["bindings"]:
        url = row["article"]["value"]
        out[int(row["tmdb"]["value"])] = requests.utils.unquote(url.rsplit("/wiki/", 1)[1])
    return out


def pageviews(title: str) -> int:
    end = dt.date.today().replace(day=1) - dt.timedelta(days=1)
    start = (end - dt.timedelta(days=365)).replace(day=1)
    url = (
        "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user/"
        f"{requests.utils.quote(title, safe='')}/monthly/{start:%Y%m%d}00/{end:%Y%m%d}00"
    )
    # Wikimedia limite les appels anonymes : on va doucement et on patiente sur un 429.
    for attempt in range(6):
        time.sleep(0.25)
        response = requests.get(url, headers=HEADERS, timeout=30)
        if response.status_code != 429:
            break
        wait = response.headers.get("Retry-After", "")
        time.sleep(int(wait) if wait.isdigit() else 5 * 2**attempt)
    if response.status_code == 404:
        return 0
    response.raise_for_status()
    return sum(item["views"] for item in response.json().get("items", []))


def add_fame(conn, films: list[dict[str, Any]]) -> None:
    """Consultations sur 12 mois, gardées un an dans game_fame."""
    known = {row["tmdb_id"]: row for row in conn.execute(
        "SELECT tmdb_id, frwiki_title, views_12m FROM game_fame WHERE measured_at > now() - interval '1 year'").fetchall()}
    missing = [f["id"] for f in films if f["id"] not in known]
    titles: dict[int, str] = {}
    for start in range(0, len(missing), 200):
        titles.update(frwiki_titles(missing[start:start + 200]))
    for tmdb_id in missing:
        title = titles.get(tmdb_id)
        views = pageviews(title) if title else 0
        conn.execute(
            """INSERT INTO game_fame (tmdb_id, frwiki_title, views_12m) VALUES (%s, %s, %s)
               ON CONFLICT (tmdb_id) DO UPDATE SET frwiki_title = EXCLUDED.frwiki_title,
               views_12m = EXCLUDED.views_12m, measured_at = now()""",
            (tmdb_id, title, views),
        )
        known[tmdb_id] = {"views_12m": views}
    for film in films:
        film["fame"] = known[film["id"]]["views_12m"] or 0


# ---------- 3 et 5. Fiche du film : suite ou pas, famille, affiche ----------
def text_on_poster(url: str) -> bool:
    if not shutil.which("tesseract"):
        return False
    with tempfile.NamedTemporaryFile(suffix=".jpg") as image:
        image.write(requests.get(url.replace("/w780/", "/w342/"), timeout=20).content)
        image.flush()
        text = subprocess.run(["tesseract", image.name, "stdout"], capture_output=True, text=True, timeout=60).stdout
    # Au moins deux vrais mots de 4 lettres : en dessous, ce sont souvent des textures lues comme du texte.
    return len(re.findall(r"[A-Za-zÀ-ÿ]{4,}", text)) >= 2


def details(client, film: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Complète le film ; None s'il doit être écarté (suite, pas d'affiche sans langue)."""
    data = client.get(
        f"/movie/{film['id']}",
        {"language": "fr-FR", "append_to_response": "credits,images,alternative_titles", "include_image_language": "null"},
    ) or {}
    collection = data.get("belongs_to_collection")
    if collection:
        parts = (client.get(f"/collection/{collection['id']}") or {}).get("parts") or []
        first = min((p for p in parts if p.get("release_date")), key=lambda p: p["release_date"], default=None)
        if first and first["id"] != film["id"]:
            return None
    posters = sorted(
        (p for p in (data.get("images") or {}).get("posters") or [] if p.get("iso_639_1") is None),
        key=lambda p: (-(p.get("vote_average") or 0), -(p.get("vote_count") or 0)),
    )
    if not posters:
        return None
    clean = next((POSTER_BASE + p["file_path"] for p in posters[:4] if not text_on_poster(POSTER_BASE + p["file_path"])), None)
    directors = [p["name"] for p in (data.get("credits") or {}).get("crew") or [] if p.get("job") == "Director"]
    companies = [c["id"] for c in data.get("production_companies") or []]
    fr_alts = [t["title"] for t in (data.get("alternative_titles") or {}).get("titles") or [] if t.get("iso_3166_1") in ("FR", "BE", "CA")]
    english = next((t["title"] for t in (data.get("alternative_titles") or {}).get("titles") or [] if t.get("iso_3166_1") in ("US", "GB")), None)
    return {
        **film,
        "title_orig": film["original_title"] if film["lang"] in ("en", "fr") else (english or film["original_title"]),
        "aliases": sorted({film["original_title"] or "", english or "", *fr_alts} - {"", film["title_fr"]}),
        "directors": directors,
        "family": next((FAMILY_OF[c] for c in companies if c in FAMILY_OF), None),
        "poster": clean or POSTER_BASE + posters[0]["file_path"],
        "check_poster": clean is None,
    }


# ---------- 4. Programme ----------
def mondays(month: str) -> list[dt.date]:
    year, number = map(int, month.split("-"))
    day = dt.date(year, number, 1)
    day += dt.timedelta(days=(7 - day.weekday()) % 7)
    out = []
    while day.month == number:
        out.append(day)
        day += dt.timedelta(days=7)
    return out


def default_months() -> list[str]:
    """Le mois qui commence dans trois mois (le workflow tourne le 15 de chaque mois)."""
    day = dt.date.today().replace(day=1)
    for _ in range(3):
        day = (day + dt.timedelta(days=32)).replace(day=1)
    return [day.strftime("%Y-%m")]


def program(months: list[str], dry_run: bool) -> None:
    client = get_tmdb_client()
    if client is None:
        raise SystemExit("TMDB_API_KEY manquante.")
    conn = connect()
    pool = tmdb_pool(client)
    excluded = {row["tmdb_id"] for row in conn.execute("SELECT tmdb_id FROM game_excluded").fetchall()}
    pool = [f for f in pool if f["id"] not in excluded]
    add_fame(conn, pool)
    pool.sort(key=lambda f: -f["fame"])
    week_pool, bonus_pool = pool[: CONFIG["week_top"]], [f for f in pool[CONFIG["week_top"]: CONFIG["bonus_top"]] if f["rating"] >= CONFIG["bonus_min_rating"]]
    log(f"Vivier : {len(pool)} films TMDB, semaine = {len(week_pool)} plus consultés, bonus = {len(bonus_pool)}.")

    taken = conn.execute(
        "SELECT kind, to_char(opens_on, 'YYYY-MM-DD') AS opens, tmdb_id, director, family FROM game_round").fetchall()
    used_ids = {row["tmdb_id"] for row in taken}
    used_directors = {d.strip() for row in taken for d in (row["director"] or "").split(",") if d.strip()}
    family_dates = [(row["family"], dt.date.fromisoformat(row["opens"])) for row in taken if row["family"]]
    scheduled = {(row["kind"], row["opens"]) for row in taken}
    rng = random.Random(CONFIG["seed"])
    seen: dict[int, Optional[dict[str, Any]]] = {}

    def info(film):
        if film["id"] not in seen:
            seen[film["id"]] = details(client, film)
        return seen[film["id"]]

    def family_free(full, day):
        return not full["family"] or all(f != full["family"] or abs((d - day).days) >= CONFIG["family_gap_days"] for f, d in family_dates)

    def pick(slot, day, candidates, rules):
        """Tire un film qui respecte les règles ; relâche les règles une à une si personne ne passe."""
        for relaxed in range(len(rules) + 1):
            active = rules[relaxed:]
            order = [f for f in candidates if f["id"] not in used_ids and all(rule(f) for _, rule in active)]
            rng.shuffle(order)
            order.sort(key=lambda f: -f["fame"] * rng.uniform(0.6, 1.4))
            for film in order[:40]:
                full = info(film)
                if not full or set(full["directors"]) & used_directors or not family_free(full, day):
                    continue
                if relaxed:
                    log(f"  {slot} : règles relâchées → {', '.join(name for name, _ in rules[:relaxed])}")
                return full
        log(f"  {slot} : aucun film possible, même en relâchant tout")
        return None

    def place(kind, opens, closes, month, full):
        used_ids.add(full["id"])
        used_directors.update(full["directors"])
        if full["family"]:
            family_dates.append((full["family"], opens))
        log(f"{kind} {opens} : {full['title_fr']} ({full['year']}) · {', '.join(full['directors'][:2])} · "
            f"{full['fame']:,} vues Wikipédia · {full['family'] or 'indépendant'}{' · AFFICHE À VÉRIFIER' if full['check_poster'] else ''}")
        if dry_run:
            return
        focus = (rng.uniform(0.15, 0.85), rng.uniform(0.15, 0.85))
        conn.execute(
            """INSERT INTO game_round (kind, opens_on, closes_on, month, tmdb_id, title_fr, title_orig, aliases, year, director,
                   letterboxd_slug, poster_url, focus_x, focus_y, status, fame, family)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, %s, %s, %s, 'proposed', %s, %s)
               ON CONFLICT (kind, opens_on) DO NOTHING""",
            (kind, opens, closes, month, full["id"], full["title_fr"], full["title_orig"], full["aliases"], full["year"],
             ", ".join(full["directors"][:2]) or None, full["poster"], focus[0], focus[1], full["fame"], full["family"]),
        )

    for month in months:
        weeks = mondays(month)
        chosen: list[dict[str, Any]] = []
        for index, monday in enumerate(weeks):
            if ("week", monday.isoformat()) in scheduled:
                continue
            last = index == len(weeks) - 1
            previous = chosen[-1] if chosen else None
            christmas = monday.month == 12 and monday.day <= 25 <= monday.day + 6
            candidates = [f for f in week_pool if christmas and f["id"] in CONFIG["christmas"]] or week_pool
            # Ordre de relâchement : la première règle de la liste saute en premier.
            rules = [
                ("genre déjà pris ce mois", lambda f: not f["genres"] or f["genres"][0] not in {c["genres"][0] for c in chosen if c["genres"]}),
                ("même décennie que la semaine d'avant", lambda f: not previous or f["year"] // 10 != previous["year"] // 10),
                ("film d'avant 2000", lambda f: not last or any(c["year"] < 2000 for c in chosen) or f["year"] < 2000),
                ("film non anglophone", lambda f: not last or any(c["lang"] != "en" for c in chosen) or f["lang"] != "en"),
                ("une animation par mois", lambda f: ANIMATION not in f["genres"] or not any(ANIMATION in c["genres"] for c in chosen)),
            ]
            full = pick(f"semaine du {monday}", monday, candidates, rules)
            if full:
                chosen.append(full)
                place("week", monday, monday + dt.timedelta(days=6), month, full)
        friday = weeks[-1] + dt.timedelta(days=4)
        if ("bonus", friday.isoformat()) not in scheduled:
            rules = [("bonus non anglophone", lambda f: f["lang"] != "en")]
            full = pick(f"bonus de {month}", friday, bonus_pool, rules)
            if full:
                place("bonus", friday, friday + dt.timedelta(days=2), month, full)

    if not dry_run:
        names = {f["title_fr"] for f in pool} | {f["original_title"] for f in pool if f["original_title"]}
        with conn.cursor() as cursor:
            cursor.executemany("INSERT INTO game_title (title) VALUES (%s) ON CONFLICT DO NOTHING", [(n,) for n in sorted(names)])
        log(f"{len(names)} titres pour la saisie assistée")
    conn.close()
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as handle:
            handle.write(("## Programme Fiftyguess (essai, rien n'est écrit)\n\n" if dry_run else "## Programme Fiftyguess\n\n")
                         + "\n".join(f"- {line}" for line in LOG) + "\n")


if __name__ == "__main__":
    args = sys.argv[1:]
    months = [a for a in args if re.fullmatch(r"\d{4}-\d{2}", a)] or default_months()
    program(months, dry_run="--essai" in args)
