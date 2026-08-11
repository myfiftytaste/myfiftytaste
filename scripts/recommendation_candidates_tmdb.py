"""Dynamic TMDB candidate pool for build_recommendations.py.

Isolated module: fetches movie candidates live from TMDB instead of the
frozen ~10k-film Megabank, so recently released and upcoming films can be
recommended. Candidates come from three fused sources:

  - seed-based: /movie/{id}/recommendations and /movie/{id}/similar, seeded
    from the user's top-rated seen films (resolved to a TMDB id via a
    title+year search, since neither the Megabank nor the user's watched
    films carry a tmdb_id today).
  - discover-based: /discover/movie, filtered from the archetype scores
    already computed by build_profile_metrics.py (mainstreamness, oldness,
    endurance, genre_dna) -- read-only, never recomputed here.
  - freshness: /movie/now_playing, /movie/upcoming, /trending/movie/week,
    cross-checked against the user's top genres before being kept.

Every candidate is normalized into the same "record" shape
build_recommendations.py's scoring functions already expect (title,
letterboxd_slug, letterboxd_url, genres, countries, directors, runtime,
original_language, average_rating, plus TMDB-native tmdb_id/tmdb_popularity/
tmdb_vote_count fields build_recommendations.py uses for its own
niche/mainstream calibration instead of Megabank's watches/fans).

TMDB detail lookups are cached on disk (data/cache/tmdb_candidates_cache.json)
so repeated runs do not re-fetch the same film; volatile fields (popularity,
vote_average, vote_count) expire on a TTL, permanent fields (genres, runtime,
director, countries) are reused indefinitely by just refetching the whole
(single) detail call once the entry goes stale.

Usage (library, not a CLI):
    from recommendation_candidates_tmdb import fetch_candidate_pool
    pool, pool_stats = fetch_candidate_pool(wrapped, metrics)
"""

from __future__ import annotations

import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import json
import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
CACHE_DIR = BASE_DIR / "data" / "cache"
CANDIDATES_CACHE_JSON = CACHE_DIR / "tmdb_candidates_cache.json"
SEED_SEARCH_CACHE_JSON = CACHE_DIR / "tmdb_seed_search_cache.json"

TMDB_BASE = "https://api.themoviedb.org/3"
REGION = "FR"  # now_playing/upcoming require a region or TMDB defaults to US
VOLATILE_TTL_SECONDS = 3 * 24 * 3600  # popularity/vote_average/vote_count go stale after 3 days
REQUEST_TIMEOUT = 10
MAX_429_RETRIES = 3
MAX_SEED_FILMS = 6
MAX_SEED_RESULTS_PER_CALL = 20
MAX_DISCOVER_PAGES = 2
MAX_FRESHNESS_PER_ENDPOINT = 20
MAX_QUALITY_RECENT_PAGES = 3

GENRE_ID_TO_NAME = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
    878: "Science Fiction", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
}
GENRE_NAME_TO_ID = {name: gid for gid, name in GENRE_ID_TO_NAME.items()}

LANGUAGE_CODE_TO_NAME = {
    "en": "English", "fr": "French", "ja": "Japanese", "es": "Spanish", "it": "Italian",
    "de": "German", "ko": "Korean", "zh": "Mandarin", "cn": "Cantonese", "ru": "Russian",
    "pt": "Portuguese", "sv": "Swedish", "da": "Danish", "no": "Norwegian", "fi": "Finnish",
    "nl": "Dutch", "pl": "Polish", "tr": "Turkish", "hi": "Hindi", "ar": "Arabic",
    "he": "Hebrew", "th": "Thai", "cs": "Czech", "el": "Greek", "hu": "Hungarian",
    "id": "Indonesian", "ro": "Romanian", "uk": "Ukrainian", "vi": "Vietnamese",
    "fa": "Persian", "ta": "Tamil", "te": "Telugu", "pl": "Polish", "is": "Icelandic",
}


def _normalize_title(value: Any) -> str:
    text = str(value or "").lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_json(path: Path, data: dict[str, Any]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


class TmdbClient:
    """Thin resilient wrapper: 429 backoff, timeouts, never raises on failure."""

    def __init__(self, api_key: str, session: Optional[requests.Session] = None):
        self.api_key = api_key
        self.session = session or requests.Session()
        self.available = True
        self.request_count = 0
        self.error_count = 0

    def get(self, path: str, params: Optional[dict[str, Any]] = None) -> Optional[dict[str, Any]]:
        if not self.available:
            return None
        query = dict(params or {})
        query["api_key"] = self.api_key
        attempt = 0
        while attempt <= MAX_429_RETRIES:
            try:
                response = self.session.get(f"{TMDB_BASE}{path}", params=query, timeout=REQUEST_TIMEOUT)
            except requests.RequestException:
                self.error_count += 1
                return None
            self.request_count += 1
            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After")
                delay = float(retry_after) if retry_after and retry_after.isdigit() else 1.5 * (attempt + 1)
                time.sleep(min(delay, 6.0))
                attempt += 1
                continue
            if response.status_code >= 500:
                self.error_count += 1
                return None
            if response.status_code != 200:
                self.error_count += 1
                return None
            try:
                return response.json()
            except ValueError:
                self.error_count += 1
                return None
        self.error_count += 1
        return None


def get_tmdb_client() -> Optional[TmdbClient]:
    load_dotenv(BASE_DIR / ".env")
    api_key = os.environ.get("TMDB_API_KEY")
    if not api_key:
        return None
    return TmdbClient(api_key)


def score_seed_candidate(title: str, year: Optional[int], candidate: dict[str, Any]) -> float:
    cand_title = candidate.get("title") or ""
    cand_original = candidate.get("original_title") or ""
    cand_year_text = (candidate.get("release_date") or "")[:4]
    norm_target = _normalize_title(title)
    best = 0.0
    for cand_text in (cand_title, cand_original):
        norm_cand = _normalize_title(cand_text)
        if not norm_cand:
            continue
        if norm_target == norm_cand:
            title_score = 0.8
        elif norm_target in norm_cand or norm_cand in norm_target:
            title_score = 0.6
        else:
            target_tokens = set(norm_target.split())
            cand_tokens = set(norm_cand.split())
            overlap = len(target_tokens & cand_tokens)
            title_score = min(0.5, overlap / len(target_tokens)) if target_tokens and overlap else 0.0
        year_score = 0.0
        if year and cand_year_text:
            try:
                year_score = 0.2 if int(cand_year_text) == int(year) else -0.05
            except ValueError:
                pass
        best = max(best, title_score + year_score)
    return min(1.0, max(0.0, best))


def resolve_seed_tmdb_ids(client: TmdbClient, seed_films: list[dict[str, Any]]) -> list[int]:
    """Resolve the user's top-rated seen films to TMDB ids via title+year search.

    Neither the Megabank nor the user's watched films carry a tmdb_id today,
    so this repeats the same search+score pattern already used by
    enrich_missing_with_tmdb.py, kept as a local, isolated copy.
    """
    cache = _load_json(SEED_SEARCH_CACHE_JSON)
    resolved: list[int] = []
    cache_dirty = False
    for film in seed_films[:MAX_SEED_FILMS]:
        title = film.get("title") or film.get("rss_title")
        year = film.get("year")
        if not title:
            continue
        cache_key = f"{_normalize_title(title)}|||{year or ''}"
        cached = cache.get(cache_key)
        if cached is not None:
            if cached.get("tmdb_id"):
                resolved.append(cached["tmdb_id"])
            continue
        params: dict[str, Any] = {"query": title}
        if year:
            params["year"] = year
        data = client.get("/search/movie", params)
        results = (data or {}).get("results") or []
        best = None
        best_score = 0.0
        for candidate in results[:5]:
            score = score_seed_candidate(str(title), year, candidate)
            if score > best_score:
                best_score = score
                best = candidate
        if best and best_score >= 0.75:
            cache[cache_key] = {"tmdb_id": best.get("id"), "score": best_score}
            resolved.append(best["id"])
        else:
            cache[cache_key] = {"tmdb_id": None, "score": best_score}
        cache_dirty = True
    if cache_dirty:
        _save_json(SEED_SEARCH_CACHE_JSON, cache)
    return resolved


def fetch_movie_details(client: TmdbClient, tmdb_id: int, cache: dict[str, Any]) -> Optional[dict[str, Any]]:
    key = str(tmdb_id)
    cached = cache.get(key)
    now = time.time()
    if cached and (now - cached.get("fetched_at", 0)) < VOLATILE_TTL_SECONDS:
        return cached
    data = client.get(f"/movie/{tmdb_id}", {"append_to_response": "credits"})
    if not data or data.get("success") is False:
        return cached  # keep stale entry rather than dropping a known-good candidate
    directors = [
        member.get("name")
        for member in (data.get("credits") or {}).get("crew") or []
        if member.get("job") == "Director" and member.get("name")
    ]
    genres = [genre.get("name") for genre in data.get("genres") or [] if genre.get("name")]
    countries = [country.get("name") for country in data.get("production_countries") or [] if country.get("name")]
    language_code = data.get("original_language")
    entry = {
        "tmdb_id": tmdb_id,
        "title": data.get("title"),
        "release_date": data.get("release_date"),
        "runtime": data.get("runtime"),
        "genres": genres,
        "countries": countries,
        "original_language": LANGUAGE_CODE_TO_NAME.get(language_code, language_code),
        "directors": directors,
        "vote_average": data.get("vote_average"),
        "vote_count": data.get("vote_count"),
        "popularity": data.get("popularity"),
        "overview": data.get("overview"),
        "adult": data.get("adult"),
        "fetched_at": now,
    }
    cache[key] = entry
    return entry


def _year_from_release_date(release_date: Optional[str]) -> Optional[int]:
    if not release_date or len(release_date) < 4:
        return None
    try:
        return int(release_date[:4])
    except ValueError:
        return None


def discover_ids(client: TmdbClient, metrics: dict[str, Any]) -> list[int]:
    radar = metrics.get("radar_scores") or {}
    genre_dna = metrics.get("genre_dna") or {}
    params: dict[str, Any] = {
        "sort_by": "popularity.desc",
        "include_adult": "false",
        "vote_count.gte": 20,
    }

    mainstream_value_5 = (radar.get("mainstreamness") or {}).get("value_5")
    if isinstance(mainstream_value_5, (int, float)):
        # 1/5 = niche taste -> lower the vote-count floor to admit lesser-known
        # films; 5/5 = mainstream -> raise it so only well-known films qualify.
        params["vote_count.gte"] = max(5, int(20 * mainstream_value_5 / 3))

    average_year = (radar.get("oldness") or {}).get("average_year")
    if isinstance(average_year, (int, float)):
        center_year = int(average_year)
        params["primary_release_date.gte"] = f"{max(1900, center_year - 12)}-01-01"
        params["primary_release_date.lte"] = f"{min(2100, center_year + 12)}-12-31"

    runtime_average = (radar.get("endurance") or {}).get("raw_value")
    if isinstance(runtime_average, (int, float)) and runtime_average > 0:
        params["with_runtime.gte"] = max(40, int(runtime_average - 25))
        params["with_runtime.lte"] = int(runtime_average + 35)

    top_genres = [name for name, _count in (genre_dna.get("top_genres") or [])[:3]]
    genre_ids = [str(GENRE_NAME_TO_ID[name]) for name in top_genres if name in GENRE_NAME_TO_ID]
    if genre_ids:
        params["with_genres"] = ",".join(genre_ids)

    ids: list[int] = []
    for page in range(1, MAX_DISCOVER_PAGES + 1):
        data = client.get("/discover/movie", {**params, "page": page})
        results = (data or {}).get("results") or []
        if not results:
            break
        ids.extend(result.get("id") for result in results if result.get("id"))
    return ids


def seed_ids_from(client: TmdbClient, seed_tmdb_ids: list[int]) -> list[int]:
    ids: list[int] = []
    for tmdb_id in seed_tmdb_ids:
        for path in (f"/movie/{tmdb_id}/recommendations", f"/movie/{tmdb_id}/similar"):
            data = client.get(path, {"page": 1})
            results = ((data or {}).get("results") or [])[:MAX_SEED_RESULTS_PER_CALL]
            ids.extend(result.get("id") for result in results if result.get("id"))
    return ids


def quality_recent_ids(client: TmdbClient) -> list[int]:
    """A dedicated discover query for well-rated films from the last ~18
    months. now_playing/upcoming/trending alone are too narrow a window to
    reliably surface films that both released recently AND already have
    enough votes to trust the rating -- most of the time only 1-2 candidates
    clear that bar, which is why the same handful of films kept winning the
    "Le Pari" slot across very different profiles. This broadens that pool
    from TMDB's full catalog instead of just the "currently airing" slice.
    """
    current_year = datetime.now(timezone.utc).year
    params: dict[str, Any] = {
        "sort_by": "vote_average.desc",
        "vote_count.gte": 30,
        "primary_release_date.gte": f"{current_year - 1}-01-01",
        "include_adult": "false",
    }
    ids: list[int] = []
    for page in range(1, MAX_QUALITY_RECENT_PAGES + 1):
        data = client.get("/discover/movie", {**params, "page": page})
        results = (data or {}).get("results") or []
        if not results:
            break
        ids.extend(result.get("id") for result in results if result.get("id"))
    return ids


def freshness_ids(client: TmdbClient, top_genre_names: list[str]) -> list[int]:
    top_genre_ids = {GENRE_NAME_TO_ID[name] for name in top_genre_names if name in GENRE_NAME_TO_ID}
    ids: list[int] = []
    endpoints = [
        ("/movie/now_playing", {"region": REGION}),
        ("/movie/upcoming", {"region": REGION}),
        ("/trending/movie/week", {}),
    ]
    for path, params in endpoints:
        data = client.get(path, params)
        results = ((data or {}).get("results") or [])[:MAX_FRESHNESS_PER_ENDPOINT]
        for result in results:
            result_genre_ids = set(result.get("genre_ids") or [])
            # Freshness candidates are cross-checked against the user's own top
            # genres before being injected, so this never becomes "everything
            # currently in theatres" regardless of taste fit.
            if not top_genre_ids or result_genre_ids & top_genre_ids:
                if result.get("id"):
                    ids.append(result["id"])
    return ids


def _seen_key(title: Any, year: Any) -> str:
    return f"{_normalize_title(title)}|||{year or ''}"


def build_seen_keys(wrapped: dict[str, Any]) -> set[str]:
    keys: set[str] = set()
    for film in wrapped.get("films") or []:
        title = film.get("title") or film.get("rss_title")
        year = film.get("year")
        if title:
            keys.add(_seen_key(title, year))
    return keys


def build_seed_films(wrapped: dict[str, Any]) -> list[dict[str, Any]]:
    films = [
        film
        for film in (wrapped.get("films") or [])
        if isinstance(film.get("user_rating"), (int, float)) and film["user_rating"] >= 4.0
    ]
    films.sort(key=lambda film: film.get("user_rating") or 0, reverse=True)
    return films


def normalize_candidate(detail: dict[str, Any]) -> Optional[dict[str, Any]]:
    if not detail or not detail.get("title"):
        return None
    year = _year_from_release_date(detail.get("release_date"))
    vote_average = detail.get("vote_average")
    # No verified Letterboxd slug/URL exists for a TMDB-sourced candidate.
    # This synthetic key only needs to (a) never collide with a real
    # Letterboxd slug, and (b) end in "-YYYY" so build_recommendations.py's
    # existing parse_year_from_slug() keeps working unmodified.
    slug = f"tmdb-{detail.get('tmdb_id')}-{year}" if year else f"tmdb-{detail.get('tmdb_id')}"
    return {
        "tmdb_id": detail.get("tmdb_id"),
        "title": detail.get("title"),
        "letterboxd_slug": slug,
        "letterboxd_url": None,
        "release_year": year,
        "genres": detail.get("genres") or [],
        "countries": detail.get("countries") or [],
        "directors": detail.get("directors") or [],
        "runtime": detail.get("runtime"),
        "original_language": detail.get("original_language"),
        "average_rating": (vote_average / 2.0) if isinstance(vote_average, (int, float)) else None,
        "description": detail.get("overview"),
        "watches": None,
        "fans": None,
        "tmdb_popularity": detail.get("popularity"),
        "tmdb_vote_count": detail.get("vote_count"),
    }


def fetch_candidate_pool(
    wrapped: dict[str, Any],
    metrics: dict[str, Any],
    debug: bool = False,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    stats: dict[str, Any] = {
        "tmdb_available": False,
        "seed_films_used": 0,
        "seed_tmdb_ids_resolved": 0,
        "raw_ids": {"seed": 0, "discover": 0, "freshness": 0, "quality_recent": 0},
        "unique_ids_considered": 0,
        "details_fetched": 0,
        "details_cache_hits": 0,
        "candidates_after_normalize": 0,
        "candidates_excluded_seen": 0,
        "requests_made": 0,
        "errors": 0,
    }

    client = get_tmdb_client()
    if client is None:
        stats["failure_reason"] = "TMDB_API_KEY not set"
        return [], stats
    stats["tmdb_available"] = True

    seed_films = build_seed_films(wrapped)
    stats["seed_films_used"] = len(seed_films[:MAX_SEED_FILMS])
    seed_tmdb_ids = resolve_seed_tmdb_ids(client, seed_films)
    stats["seed_tmdb_ids_resolved"] = len(seed_tmdb_ids)

    genre_dna = metrics.get("genre_dna") or {}
    top_genre_names = [name for name, _count in (genre_dna.get("top_genres") or [])[:5]]

    seed_ids = seed_ids_from(client, seed_tmdb_ids) if seed_tmdb_ids else []
    discover_id_list = discover_ids(client, metrics)
    fresh_ids = freshness_ids(client, top_genre_names)
    quality_recent = quality_recent_ids(client)
    stats["raw_ids"] = {
        "seed": len(seed_ids),
        "discover": len(discover_id_list),
        "freshness": len(fresh_ids),
        "quality_recent": len(quality_recent),
    }

    unique_ids: list[int] = []
    seen_ids: set[int] = set()
    for source_ids in (seed_ids, discover_id_list, fresh_ids, quality_recent):
        for movie_id in source_ids:
            if movie_id not in seen_ids:
                seen_ids.add(movie_id)
                unique_ids.append(movie_id)
    stats["unique_ids_considered"] = len(unique_ids)

    details_cache = _load_json(CANDIDATES_CACHE_JSON)
    seen_keys = build_seen_keys(wrapped)

    candidates: list[dict[str, Any]] = []
    for movie_id in unique_ids:
        was_cached = str(movie_id) in details_cache and (
            time.time() - details_cache[str(movie_id)].get("fetched_at", 0) < VOLATILE_TTL_SECONDS
        )
        detail = fetch_movie_details(client, movie_id, details_cache)
        if was_cached:
            stats["details_cache_hits"] += 1
        elif detail:
            stats["details_fetched"] += 1
        record = normalize_candidate(detail) if detail else None
        if not record:
            continue
        if _seen_key(record["title"], record["release_year"]) in seen_keys:
            stats["candidates_excluded_seen"] += 1
            continue
        candidates.append(record)

    stats["candidates_after_normalize"] = len(candidates)
    stats["requests_made"] = client.request_count
    stats["errors"] = client.error_count

    _save_json(CANDIDATES_CACHE_JSON, details_cache)

    if debug:
        print(json.dumps(stats, indent=2))

    return candidates, stats
