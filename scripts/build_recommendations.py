"""Build deterministic film recommendations from a live TMDB candidate pool
and profile metrics.

Usage:
    python scripts/build_recommendations.py <letterboxd_username>

Inputs:
    data/output/<username>_wrapped.json
    data/output/<username>_profile_metrics.json
    TMDB (live, cached under data/cache/) via recommendation_candidates_tmdb.py

Outputs:
    data/output/<username>_recommendations.json
    data/output/<username>_recommendations_report.md
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, median
from typing import Any, Optional
from urllib.parse import quote

from recommendation_candidates_tmdb import fetch_candidate_pool


BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "data" / "output"
# Reference-only now: used to look up a verified Letterboxd link for a
# candidate that happens to still be in the old bank, never as a candidate
# source (that's recommendation_candidates_tmdb.py's job).
MEGABANK_JSON = BASE_DIR / "data" / "processed" / "megabank_clean.json"
CURRENT_YEAR = datetime.now(timezone.utc).year

COUNTRY_NAME_MAP = {
    "US": "USA",
    "USA": "USA",
    "United States": "USA",
    "United States of America": "USA",
    "GB": "UK",
    "UK": "UK",
    "United Kingdom": "UK",
    "JP": "Japan",
    "JPN": "Japan",
    "Japan": "Japan",
    "FR": "France",
    "FRA": "France",
    "France": "France",
    "KR": "South Korea",
    "KOR": "South Korea",
    "South Korea": "South Korea",
    "ES": "Spain",
    "ESP": "Spain",
    "Spain": "Spain",
    "IT": "Italy",
    "ITA": "Italy",
    "Italy": "Italy",
    "SE": "Sweden",
    "SWE": "Sweden",
    "Sweden": "Sweden",
    "DE": "Germany",
    "DEU": "Germany",
    "Germany": "Germany",
    "CA": "Canada",
    "CAN": "Canada",
    "Canada": "Canada",
    "IE": "Ireland",
    "IRL": "Ireland",
    "Ireland": "Ireland",
    "NG": "Nigeria",
    "NGA": "Nigeria",
    "Nigeria": "Nigeria",
    "BE": "Belgium",
    "BEL": "Belgium",
    "Belgium": "Belgium",
    "CH": "Switzerland",
    "CHE": "Switzerland",
    "Switzerland": "Switzerland",
}


def safe_float(value: Any) -> Optional[float]:
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or not math.isfinite(number):
        return None
    return number


def rounded(value: Any, digits: int = 3) -> Any:
    number = safe_float(value)
    return round(number, digits) if number is not None else None


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def normalize_country_name(value: Any) -> Optional[str]:
    if value is None:
        return None
    country = str(value).strip()
    if not country:
        return None
    return COUNTRY_NAME_MAP.get(country, country)


def normalize_title(value: Any) -> str:
    text = str(value or "").lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def title_tokens(value: Any) -> set[str]:
    return {token for token in normalize_title(value).split() if len(token) > 2}


# TODO: add feature-film eligibility filter if Megabank contains series/episodes/specials.


def is_recommendation_eligible(record: dict[str, Any]) -> tuple[bool, Optional[str]]:
    """Light eligibility filter for obvious non-feature or TV-adjacent objects.

    The Megabank is Letterboxd-shaped, so some valid records can still be pilots,
    TV movies, shorts, episodes, or compilation/special objects. Keep this filter
    conservative and documented rather than trying to solve eligibility globally.
    TODO: add feature-film eligibility filter if Megabank contains series/episodes/specials.
    """
    title = normalize_title(record.get("title"))
    slug = normalize_title(record.get("letterboxd_slug"))
    description = normalize_title(record.get("description"))
    genres = {str(value).lower() for value in list_values(record.get("genres")) if value}
    runtime = safe_float(record.get("runtime"))
    year = parse_year_from_slug(record.get("letterboxd_slug"))
    title_slug_text = f" {title} {slug} "
    explicit_description_terms = {
        "series pilot",
        "tv series",
        "pilot episode",
        "miniseries",
        "mini series",
        "standalone version of the series",
        "tv special",
        "television special",
    }
    explicit_title_terms = {" season ", " episode "}
    if any(term in description for term in explicit_description_terms):
        return False, "tv_or_series_signal"
    if any(term in title_slug_text for term in explicit_title_terms):
        return False, "tv_or_series_signal"
    if "pilot" in description and ("series" in description or "television" in description):
        return False, "tv_or_series_signal"
    if "tv movie" in genres:
        return False, "tv_movie_genre"
    if runtime is not None and runtime < 55:
        return False, "short_runtime"
    if year is None and "vhs market" in description and "series" in description:
        return False, "ambiguous_without_year"
    return True, None


def parse_year_from_slug(slug: Any) -> Optional[int]:
    if not slug:
        return None
    match = re.search(r"(?:^|-)((?:18|19|20)\d{2})(?:-\d+)?$", str(slug))
    if not match:
        return None
    year = int(match.group(1))
    return year if 1870 <= year <= 2100 else None


def load_megabank_url_lookup() -> dict[str, Any]:
    """Verified Letterboxd URLs from the old bank, read-only reference (not a
    candidate source): a TMDB candidate that happens to still be in the old
    bank gets its real, already-verified Letterboxd link instead of a search
    fallback. No network call involved.

    Most Megabank slugs carry NO year suffix at all (Letterboxd only adds
    "-YYYY" to disambiguate a title collision), so a (title, year) key alone
    misses the common case. Two tiers instead:
      - by_title_year: keyed on (title, year) for slugs that do carry a
        parseable year, for the homonym case (e.g. two different-era
        "Nosferatu" entries).
      - by_title_only: keyed on title alone, but only for titles that are
        unique across the whole bank -- ambiguous titles are dropped from
        this tier rather than risk resolving to the wrong film.
    """
    if not MEGABANK_JSON.exists():
        return {"by_title_year": {}, "by_title_only": {}}
    try:
        records = json.loads(MEGABANK_JSON.read_text(encoding="utf-8"))
    except Exception:
        return {"by_title_year": {}, "by_title_only": {}}

    by_title_year: dict[tuple[str, int], str] = {}
    title_occurrences: dict[str, list[str]] = {}
    for record in records:
        if not isinstance(record, dict):
            continue
        url = record.get("letterboxd_url")
        title = record.get("title")
        if not url or not title:
            continue
        norm_title = normalize_title(title)
        title_occurrences.setdefault(norm_title, []).append(str(url))
        year = parse_year_from_slug(record.get("letterboxd_slug"))
        if year is not None:
            by_title_year[(norm_title, year)] = str(url)

    by_title_only = {
        norm_title: urls[0] for norm_title, urls in title_occurrences.items() if len(urls) == 1
    }
    return {"by_title_year": by_title_year, "by_title_only": by_title_only}


def letterboxd_search_url(title: str, year: Optional[int] = None) -> str:
    # Including the year in the query text helps Letterboxd's own search
    # disambiguate homonyms (two different films sharing a title) -- we
    # can't know their internal slug/ranking logic, but their search does
    # match against a film's displayed year, so this narrows the results the
    # user lands on instead of a bare, ambiguous title search.
    query = f"{title} {year}" if year else str(title)
    return f"https://letterboxd.com/search/films/{quote(query)}/"


def resolve_letterboxd_url(
    record: dict[str, Any],
    year: Optional[int],
    megabank_lookup: dict[str, Any],
) -> str:
    """Always returns a working link: a verified old-bank URL when we have
    one, otherwise Letterboxd's own search (never a guessed /film/{slug}/,
    since Letterboxd's disambiguation suffix for common titles can't be
    predicted offline without scraping). Pure string lookup/formatting --
    no network call, safe to run for every candidate during batch generation;
    the actual "does this page exist" resolution happens in the user's
    browser at click time, on Letterboxd's own servers.
    """
    title = record.get("title")
    if not title:
        return ""
    norm_title = normalize_title(title)
    by_title_year = megabank_lookup.get("by_title_year") or {}
    by_title_only = megabank_lookup.get("by_title_only") or {}
    # by_title_only is already restricted to titles unique across the whole
    # bank (built in load_megabank_url_lookup), so it can never resolve a
    # homonym to the wrong film -- a genuine homonym just falls through to
    # the year-qualified search below.
    known = (by_title_year.get((norm_title, year)) if year is not None else None) or by_title_only.get(norm_title)
    return known or letterboxd_search_url(str(title), year)


def list_values(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def weighted_overlap(values: list[str], weights: dict[str, float]) -> float:
    if not values or not weights:
        return 0.0
    matched = sum(weights.get(value, 0.0) for value in values)
    total = sum(weights.values()) or 1.0
    return clamp(matched / total)


def normalized_rating(value: Optional[float]) -> float:
    if value is None:
        return 0.45
    return clamp((value - 2.5) / 2.0)


def niche_score(watches: Optional[float], median_watches: Optional[float]) -> float:
    if watches is None or watches <= 0:
        return 0.5
    if median_watches is None or median_watches <= 0:
        return 0.5
    return clamp((math.log10(median_watches) - math.log10(watches) + 1.0) / 2.0)


def fans_ratio(fans: Optional[float], watches: Optional[float]) -> float:
    if fans is None or watches is None or watches <= 0:
        return 0.0
    return fans / watches


def build_profile_context(wrapped: dict[str, Any], metrics: dict[str, Any]) -> dict[str, Any]:
    films = wrapped.get("films") or []
    metadata_films = [
        film
        for film in films
        if film.get("has_metadata") is True and film.get("source") in {"megabank", "supplemental"}
    ]
    social_films = [
        film for film in films if film.get("has_social_stats") is True and film.get("source") == "megabank"
    ]

    genre_counter: Counter[str] = Counter()
    country_counter: Counter[str] = Counter()
    director_counter: Counter[str] = Counter()
    languages: Counter[str] = Counter()
    runtimes: list[float] = []
    years: list[int] = []
    watches: list[float] = []
    watched_titles = []

    for film in films:
        watched_titles.append(film.get("title") or film.get("rss_title") or film.get("letterboxd_slug"))
    for film in metadata_films:
        genre_counter.update([str(value) for value in list_values(film.get("genres")) if value])
        country_counter.update(
            [country for country in (normalize_country_name(value) for value in list_values(film.get("countries"))) if country]
        )
        director_counter.update([str(value) for value in list_values(film.get("directors")) if value])
        language = film.get("original_language")
        if language:
            languages.update([str(language)])
        runtime = safe_float(film.get("runtime"))
        if runtime and runtime > 0:
            runtimes.append(runtime)
        year = safe_float(film.get("year"))
        if year and 1870 <= year <= 2100:
            years.append(int(year))
    for film in social_films:
        value = safe_float(film.get("watches"))
        if value is not None and value > 0:
            watches.append(value)

    total_genres = sum(genre_counter.values()) or 1
    total_countries = sum(country_counter.values()) or 1
    country_weights = {country: count / total_countries for country, count in country_counter.items()}
    return {
        "genre_weights": {genre: count / total_genres for genre, count in genre_counter.items()},
        "country_weights": country_weights,
        "non_us_share": sum(weight for country, weight in country_weights.items() if country != "USA"),
        "languages": set(languages),
        "directors": set(director_counter),
        "runtime_average": mean(runtimes) if runtimes else None,
        "average_year": mean(years) if years else None,
        "watches_median": median(watches) if watches else None,
        "watched_title_tokens": [title_tokens(title) for title in watched_titles],
        "top_genres": [genre for genre, _ in genre_counter.most_common(3)],
        "secondary_genres": [genre for genre, _ in genre_counter.most_common(8)][3:],
        "radar": metrics.get("radar_scores") or {},
    }


def is_candidate(record: dict[str, Any], seen_slugs: set[str]) -> bool:
    title = record.get("title")
    slug = record.get("letterboxd_slug")
    if not title or not slug or slug in seen_slugs:
        return False
    if not list_values(record.get("genres")):
        return False
    if not list_values(record.get("countries")):
        return False
    runtime = safe_float(record.get("runtime"))
    if runtime is None or runtime <= 0:
        return False
    eligible, _reason = is_recommendation_eligible(record)
    if not eligible:
        return False
    return True


def redundancy_penalty(record: dict[str, Any], watched_token_sets: list[set[str]]) -> float:
    candidate_tokens = title_tokens(record.get("title"))
    if not candidate_tokens:
        return 0.0
    best_overlap = 0.0
    for tokens in watched_token_sets:
        if not tokens:
            continue
        overlap = len(candidate_tokens & tokens) / max(1, min(len(candidate_tokens), len(tokens)))
        best_overlap = max(best_overlap, overlap)
    if best_overlap >= 0.8:
        return 0.2
    if best_overlap >= 0.6:
        return 0.08
    return 0.0


def score_candidate(record: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    genres = [str(value) for value in list_values(record.get("genres")) if value]
    countries = [
        country
        for country in (normalize_country_name(value) for value in list_values(record.get("countries")))
        if country
    ]
    directors = [str(value) for value in list_values(record.get("directors")) if value]
    runtime = safe_float(record.get("runtime"))
    year = parse_year_from_slug(record.get("letterboxd_slug"))
    # TMDB candidates carry no Letterboxd watches/fans counts (dropped from
    # the Megabank in this build); popularity/vote_count are the TMDB-native
    # stand-ins, compared against the candidate pool's own median rather than
    # the user's Letterboxd watch history, since the two live on unrelated
    # numeric scales.
    vote_count = safe_float(record.get("tmdb_vote_count"))
    fans = safe_float(record.get("fans"))
    watches = safe_float(record.get("watches"))
    average_rating = safe_float(record.get("average_rating"))

    genre_score = weighted_overlap(genres, context["genre_weights"])
    country_score = weighted_overlap(countries, context["country_weights"])
    language_score = 1.0 if record.get("original_language") in context["languages"] else 0.0
    runtime_score = 0.5
    if runtime is not None and context["runtime_average"]:
        runtime_score = clamp(1 - abs(runtime - context["runtime_average"]) / 70)
    year_score = 0.5
    if year is not None and context["average_year"]:
        year_score = clamp(1 - abs(year - context["average_year"]) / 45)
    mainstream_target = safe_float(context["radar"].get("mainstreamness", {}).get("value_5")) or 3
    pool_vote_count_median = context.get("tmdb_vote_count_median")
    mainstream_value = clamp(1 - niche_score(vote_count, pool_vote_count_median)) if vote_count else 0.45
    mainstream_score = clamp(1 - abs(mainstream_value - (mainstream_target / 5)))
    # Fresh/upcoming TMDB candidates can carry a vote_average built from a
    # handful of votes (a single 5-star rating reads as a perfect score
    # otherwise). Blend toward the neutral baseline as vote_count drops so a
    # barely-rated new release can't look like a critically acclaimed pick.
    rating_confidence = clamp((vote_count or 0.0) / 50.0)
    rating_score = normalized_rating(average_rating) * rating_confidence + 0.45 * (1 - rating_confidence)
    cult_bonus = clamp(fans_ratio(fans, watches) / 0.04)
    director_bonus = 1.0 if any(director in context["directors"] for director in directors) else 0.0
    redundancy = redundancy_penalty(record, context["watched_title_tokens"])

    compatibility = (
        genre_score * 0.32
        + country_score * 0.12
        + language_score * 0.05
        + runtime_score * 0.12
        + year_score * 0.12
        + mainstream_score * 0.08
        + rating_score * 0.13
        + cult_bonus * 0.04
        + director_bonus * 0.08
        - redundancy
    )

    return {
        "compatibility": clamp(compatibility),
        "genre_score": genre_score,
        "country_score": country_score,
        "runtime_score": runtime_score,
        "year_score": year_score,
        "mainstream_score": mainstream_score,
        "rating_score": rating_score,
        "cult_bonus": cult_bonus,
        "director_bonus": director_bonus,
        "redundancy_penalty": redundancy,
        "niche_score": niche_score(vote_count, pool_vote_count_median),
        "fans_ratio": fans_ratio(fans, watches),
        "year": year,
    }


def reason_codes_for(record: dict[str, Any], score: dict[str, Any], context: dict[str, Any], slot: str) -> list[str]:
    codes = []
    if score["genre_score"] > 0.18:
        codes.append("genre_match")
    if score["country_score"] > 0.08:
        codes.append("country_match")
    if score["runtime_score"] > 0.75:
        codes.append("runtime_match")
    if score["rating_score"] > 0.65:
        codes.append("high_community_rating")
    if score["director_bonus"] > 0:
        codes.append("director_affinity")
    if score["cult_bonus"] > 0.35:
        codes.append("fans_watches_signal")
    countries = [normalize_country_name(value) for value in list_values(record.get("countries"))]
    if any(country and country != "USA" for country in countries):
        codes.append("non_us_angle")
    if score.get("year") and context.get("average_year") and abs(score["year"] - context["average_year"]) >= 15:
        codes.append("decade_shift")
    if slot == "safe_pick":
        codes.append("low_popularity_gem")
    if slot == "wild_card":
        codes.append("fresh_acclaimed")
    if slot == "deep_cut":
        codes.append("new_country_discovery")
    return codes


def reason_text(slot: str, record: dict[str, Any], context: dict[str, Any]) -> str:
    if slot == "safe_pick":
        return "Un film proche de tes genres favoris, plus confidentiel et sorti depuis un moment — mérite d’être redécouvert."
    if slot == "deep_cut":
        return "Un détour vers un pays que tu n’as pas encore exploré, tout en restant proche de tes goûts habituels."
    return "Un pari récent et bien accueilli, qui prend un peu de distance avec tes habitudes."


def recommendation_payload(slot: str, record: dict[str, Any], score_value: float, score: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    directors = list_values(record.get("directors"))
    year = score.get("year")
    megabank_lookup = context.get("megabank_url_lookup") or {}
    return {
        "slot": slot,
        "title": record.get("title"),
        "year": year,
        "slug": record.get("letterboxd_slug"),
        "letterboxd_url": resolve_letterboxd_url(record, year, megabank_lookup),
        "score": rounded(score_value, 4),
        "reason_codes": reason_codes_for(record, score, context, slot),
        "reason_text": reason_text(slot, record, context),
        "genres": list_values(record.get("genres")),
        "countries": [normalize_country_name(value) for value in list_values(record.get("countries")) if normalize_country_name(value)],
        "runtime": rounded(record.get("runtime"), 0),
        "average_rating": rounded(record.get("average_rating"), 2),
        "rating_source": "tmdb",
        "watches": rounded(record.get("watches"), 0),
        "fans": rounded(record.get("fans"), 0),
        "director": directors[0] if directors else None,
        "tmdb_id": record.get("tmdb_id"),
        "tmdb_popularity": rounded(record.get("tmdb_popularity"), 2),
        "tmdb_vote_count": rounded(record.get("tmdb_vote_count"), 0),
    }


def primary_director(record: dict[str, Any]) -> Optional[str]:
    directors = list_values(record.get("directors"))
    return str(directors[0]) if directors else None


def franchise_key(record: dict[str, Any]) -> str:
    base = normalize_title(record.get("title") or record.get("letterboxd_slug"))
    tokens = [
        token
        for token in base.split()
        if token not in {"the", "a", "an", "part", "chapter", "episode", "film"}
        and not token.isdigit()
    ]
    return " ".join(tokens[:3])


def too_close_to_chosen(record: dict[str, Any], chosen_items: list[dict[str, Any]]) -> bool:
    candidate_tokens = title_tokens(record.get("title") or record.get("letterboxd_slug"))
    candidate_key = franchise_key(record)
    for item in chosen_items:
        other = item["record"]
        if candidate_key and candidate_key == franchise_key(other):
            return True
        other_tokens = title_tokens(other.get("title") or other.get("letterboxd_slug"))
        if not candidate_tokens or not other_tokens:
            continue
        overlap = len(candidate_tokens & other_tokens) / max(1, min(len(candidate_tokens), len(other_tokens)))
        if overlap >= 0.7:
            return True
    return False


def genre_signature(record: dict[str, Any]) -> tuple[str, ...]:
    return tuple(sorted(str(value) for value in list_values(record.get("genres"))[:2] if value))


def countries_set(record: dict[str, Any]) -> set[str]:
    return {
        country
        for country in (normalize_country_name(value) for value in list_values(record.get("countries")))
        if country
    }


def popularity_bucket(record: dict[str, Any], context: dict[str, Any]) -> str:
    vote_count = safe_float(record.get("tmdb_vote_count"))
    median_vote_count = context.get("tmdb_vote_count_median")
    if vote_count is None or vote_count <= 0 or not median_vote_count:
        return "unknown"
    if vote_count >= median_vote_count * 2.0:
        return "high"
    if vote_count <= median_vote_count * 0.45:
        return "low"
    return "mid"




# --- Slot 1 "safe_pick" ("La Pépite"): strong thematic proximity, low
# popularity within this run's own pool, older release. ---
SLOT1_POPULARITY_PERCENTILE_MAX = 0.35
SLOT1_MAX_RELEASE_YEAR = CURRENT_YEAR - 3

# --- Slot 2 "wild_card" ("Le Pari"): departs from habits, well-rated (with
# enough votes to trust the rating), popularity a notch above slot 1, recent. ---
SLOT2_POPULARITY_PERCENTILE_MIN = 0.35
SLOT2_POPULARITY_PERCENTILE_MAX = 0.85
SLOT2_MIN_RELEASE_YEAR = CURRENT_YEAR - 1
SLOT2_MIN_RATING_SCORE = 0.65
SLOT2_MIN_VOTE_COUNT = 30
WILD_CARD_TOP_K = 5

# --- Slot 3 "deep_cut" ("Le Détour"): a country the user hasn't seen yet,
# filtered down to picks that still fit their usual taste. ---
SLOT3_MIN_THEMATIC_PROXIMITY = 0.15
SLOT3_MIN_RATING_SCORE = 0.4
SLOT3_MIN_VOTE_COUNT = 10


def thematic_proximity(score: dict[str, Any]) -> float:
    return clamp(score["genre_score"] * 0.7 + score["country_score"] * 0.15 + score["director_bonus"] * 0.15)


def assign_popularity_percentiles(items: list[dict[str, Any]]) -> None:
    """Ranks each item's TMDB vote_count within this run's own candidate
    pool (0 = least popular, 1 = most) -- "low popularity" is always relative
    to the pool, never a fixed watch-count threshold (Letterboxd's watches
    has no TMDB equivalent to threshold against)."""
    ranked = sorted(items, key=lambda item: safe_float(item["record"].get("tmdb_vote_count")) or 0)
    count = len(ranked)
    for index, item in enumerate(ranked):
        item["popularity_percentile"] = index / (count - 1) if count > 1 else 0.5


def seen_countries_from_context(context: dict[str, Any]) -> set[str]:
    # country_weights already covers every country in the user's watched
    # films with metadata (built in build_profile_context), unlike
    # profile_metrics.json's country_passport.top_countries, which is
    # truncated -- using the truncated list here would wrongly treat an
    # already-seen country as "new".
    return {country for country in context.get("country_weights", {}) if country}


def has_unseen_country(record: dict[str, Any], seen_countries: set[str]) -> bool:
    return bool(countries_set(record) - seen_countries)


def first_nonempty(pool: list[dict[str, Any]], filters: list[Any]) -> tuple[list[dict[str, Any]], int]:
    """Tries each filter in order, strictest first; returns the first
    non-empty subset and how many relaxation steps were needed to get there."""
    for level, predicate in enumerate(filters):
        subset = [item for item in pool if predicate(item)]
        if subset:
            return subset, level
    return [], len(filters)


def slot1_candidates(pool: list[dict[str, Any]], context: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
    def strict(item: dict[str, Any]) -> bool:
        year = item["score"].get("year")
        return (
            item["popularity_percentile"] <= SLOT1_POPULARITY_PERCENTILE_MAX
            and year is not None and year <= SLOT1_MAX_RELEASE_YEAR
        )

    def relax_popularity(item: dict[str, Any]) -> bool:
        year = item["score"].get("year")
        return year is not None and year <= SLOT1_MAX_RELEASE_YEAR

    def relax_date_too(_item: dict[str, Any]) -> bool:
        return True

    subset, level = first_nonempty(pool, [strict, relax_popularity, relax_date_too])
    subset.sort(key=lambda item: (item["thematic_proximity"], item["score"]["compatibility"]), reverse=True)
    return subset, level


def wild_card_rank(item: dict[str, Any]) -> float:
    # Quality stays dominant (matches the brief's "tri: note décroissante"),
    # but a pure rating sort has zero personalization: the single
    # best-rated film in the pool would win this slot for every profile,
    # which is exactly the "everyone gets the same film" problem this was
    # meant to avoid. Blending in a compatibility share lets different
    # users land on different picks once several candidates clear the
    # quality bar, without letting a mediocre-but-compatible film beat a
    # clearly better-rated one.
    return item["score"]["rating_score"] * 0.7 + item["score"]["compatibility"] * 0.3


def slot2_candidates(pool: list[dict[str, Any]], context: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
    def quality_ok(item: dict[str, Any]) -> bool:
        vote_count = safe_float(item["record"].get("tmdb_vote_count")) or 0
        return item["score"]["rating_score"] >= SLOT2_MIN_RATING_SCORE and vote_count >= SLOT2_MIN_VOTE_COUNT

    def strict(item: dict[str, Any]) -> bool:
        year = item["score"].get("year")
        return (
            SLOT2_POPULARITY_PERCENTILE_MIN <= item["popularity_percentile"] <= SLOT2_POPULARITY_PERCENTILE_MAX
            and year is not None and year >= SLOT2_MIN_RELEASE_YEAR
            and quality_ok(item)
        )

    def relax_popularity(item: dict[str, Any]) -> bool:
        year = item["score"].get("year")
        return year is not None and year >= SLOT2_MIN_RELEASE_YEAR and quality_ok(item)

    def relax_date_too(item: dict[str, Any]) -> bool:
        return quality_ok(item)

    def relax_quality_too(_item: dict[str, Any]) -> bool:
        return True

    subset, level = first_nonempty(pool, [strict, relax_popularity, relax_date_too, relax_quality_too])
    subset.sort(key=lambda item: (wild_card_rank(item), item["score"]["rating_score"]), reverse=True)
    return subset, level


def slot3_candidates(pool: list[dict[str, Any]], context: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
    seen_countries = seen_countries_from_context(context)

    def quality_ok(item: dict[str, Any]) -> bool:
        vote_count = safe_float(item["record"].get("tmdb_vote_count")) or 0
        return item["score"]["rating_score"] >= SLOT3_MIN_RATING_SCORE and vote_count >= SLOT3_MIN_VOTE_COUNT

    def strict(item: dict[str, Any]) -> bool:
        return (
            has_unseen_country(item["record"], seen_countries)
            and item["thematic_proximity"] >= SLOT3_MIN_THEMATIC_PROXIMITY
            and quality_ok(item)
        )

    def relax_quality(item: dict[str, Any]) -> bool:
        return has_unseen_country(item["record"], seen_countries) and item["thematic_proximity"] >= SLOT3_MIN_THEMATIC_PROXIMITY

    def relax_thematic_floor_too(item: dict[str, Any]) -> bool:
        return has_unseen_country(item["record"], seen_countries)

    def relax_country_too(_item: dict[str, Any]) -> bool:
        # Absolute last resort so the slot is never empty: if the pool
        # somehow has no unseen-country candidate left, still return the
        # closest-taste film rather than leaving the slot unfilled.
        return True

    subset, level = first_nonempty(pool, [strict, relax_quality, relax_thematic_floor_too, relax_country_too])
    subset.sort(key=lambda item: (item["thematic_proximity"], item["score"]["compatibility"]), reverse=True)
    return subset, level


SLOT_CANDIDATE_BUILDERS = {
    "safe_pick": slot1_candidates,
    "wild_card": slot2_candidates,
    "deep_cut": slot3_candidates,
}
SLOT_SCORE_KEY = {
    "safe_pick": lambda item: item["thematic_proximity"],
    "wild_card": wild_card_rank,
    "deep_cut": lambda item: item["thematic_proximity"],
}


def diversity_reject_reason(
    item: dict[str, Any],
    chosen_items: list[dict[str, Any]],
    used_directors: set[str],
) -> Optional[str]:
    record = item["record"]
    director = primary_director(record)
    if director and director in used_directors:
        return "duplicate_director"
    if too_close_to_chosen(record, chosen_items):
        return "title_or_franchise_proximity"
    candidate_signature = genre_signature(record)
    if candidate_signature and len(chosen_items) >= 2:
        existing_signatures = [genre_signature(chosen["record"]) for chosen in chosen_items]
        if all(candidate_signature == signature for signature in existing_signatures):
            return "duplicate_genre_signature"
    return None


def deterministic_pick_index(username: Optional[str], count: int) -> int:
    if count <= 1 or not username:
        return 0
    digest = hashlib.sha256(username.encode("utf-8")).hexdigest()
    return int(digest, 16) % count


def select_diverse_recommendations(scored: list[dict[str, Any]], context: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    assign_popularity_percentiles(scored)
    for item in scored:
        item["thematic_proximity"] = thematic_proximity(item["score"])

    chosen_items: list[dict[str, Any]] = []
    used_directors: set[str] = set()
    rejected: list[dict[str, Any]] = []
    relaxation_used: dict[str, int] = {}
    username = context.get("username")

    for slot in ["safe_pick", "wild_card", "deep_cut"]:
        chosen_slugs = {chosen["record"].get("letterboxd_slug") for chosen in chosen_items}
        available = [item for item in scored if item["record"].get("letterboxd_slug") not in chosen_slugs]
        pool, relaxation_level = SLOT_CANDIDATE_BUILDERS[slot](available, context)
        relaxation_used[slot] = relaxation_level

        eligible: list[dict[str, Any]] = []
        for item in pool:
            reason = diversity_reject_reason(item, chosen_items, used_directors)
            if reason:
                rejected.append({
                    "slot": slot,
                    "title": item["record"].get("title"),
                    "director": primary_director(item["record"]),
                    "countries": sorted(countries_set(item["record"])),
                    "score": rounded(SLOT_SCORE_KEY[slot](item), 4),
                    "reason": reason,
                })
                continue
            eligible.append(item)
            if slot != "wild_card" and len(eligible) >= 1:
                break
            if slot == "wild_card" and len(eligible) >= WILD_CARD_TOP_K:
                break

        selected = None
        if eligible:
            if slot == "wild_card":
                # All top-K candidates already cleared the quality gate (see
                # slot2_candidates), so this only decides *which* excellent
                # film this specific user sees -- without it, the single
                # best-rated film in the pool would win this slot for every
                # profile, since rating dominates the ranking by design.
                # Hashing the username keeps it deterministic (same user,
                # same re-run -> same pick) while spreading different users
                # across the top-K instead of all converging on #1.
                selected = eligible[deterministic_pick_index(username, len(eligible))]
            else:
                selected = eligible[0]
        if selected is None and pool:
            # Every candidate failed the diversity checks: "toujours 3 recos"
            # wins over strict diversity in the worst case.
            selected = pool[0]
            rejected.append({
                "slot": slot,
                "title": selected["record"].get("title"),
                "director": primary_director(selected["record"]),
                "countries": sorted(countries_set(selected["record"])),
                "score": rounded(SLOT_SCORE_KEY[slot](selected), 4),
                "reason": "fallback_without_full_diversity",
            })
        if selected is None:
            continue
        selected["selected_slot"] = slot
        selected["slot_score"] = SLOT_SCORE_KEY[slot](selected)
        chosen_items.append(selected)
        director = primary_director(selected["record"])
        if director:
            used_directors.add(director)

    recommendations = [
        recommendation_payload(item["selected_slot"], item["record"], item["slot_score"], item["score"], context)
        for item in chosen_items
    ]
    diversity = {
        "directors": [rec.get("director") for rec in recommendations],
        "distinct_directors": len([rec.get("director") for rec in recommendations if rec.get("director")]) == len({rec.get("director") for rec in recommendations if rec.get("director")}),
        "primary_genres": [list_values(item["record"].get("genres"))[:2] for item in chosen_items],
        "countries": [recommendation.get("countries") for recommendation in recommendations],
        "popularity": [popularity_bucket(item["record"], context) for item in chosen_items],
        "non_us_recommendation_found": any(any(country != "USA" for country in rec.get("countries", [])) for rec in recommendations),
        "relaxation_used": relaxation_used,
        "rejected": rejected,
    }
    return recommendations, diversity


def build_recommendations(username: str) -> tuple[Path, Path]:
    wrapped_path = OUTPUT_DIR / f"{username}_wrapped.json"
    metrics_path = OUTPUT_DIR / f"{username}_profile_metrics.json"
    if not wrapped_path.exists():
        raise FileNotFoundError(f"Missing wrapped JSON: {wrapped_path}")
    if not metrics_path.exists():
        raise FileNotFoundError(f"Missing profile metrics JSON: {metrics_path}")

    wrapped = json.loads(wrapped_path.read_text(encoding="utf-8"))
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    films = wrapped.get("films") or []
    seen_slugs = {film.get("letterboxd_slug") for film in films if film.get("letterboxd_slug")}
    context = build_profile_context(wrapped, metrics)

    candidate_pool, pool_stats = fetch_candidate_pool(wrapped, metrics)
    pool_vote_counts = [
        value
        for value in (safe_float(record.get("tmdb_vote_count")) for record in candidate_pool)
        if value is not None and value > 0
    ]
    context["tmdb_vote_count_median"] = median(pool_vote_counts) if pool_vote_counts else None
    context["megabank_url_lookup"] = load_megabank_url_lookup()
    context["username"] = username

    scored = []
    eligibility_excluded = []
    for record in candidate_pool:
        if not isinstance(record, dict):
            continue
        eligible, eligibility_reason = is_recommendation_eligible(record)
        if not eligible:
            eligibility_excluded.append({
                "title": record.get("title"),
                "slug": record.get("letterboxd_slug"),
                "reason": eligibility_reason,
            })
            continue
        if not is_candidate(record, seen_slugs):
            continue
        score = score_candidate(record, context)
        scored.append({"record": record, "score": score})

    if len(scored) < 3:
        if not pool_stats.get("tmdb_available"):
            reason = "TMDB was unavailable for this run, so no candidate pool could be built."
        else:
            reason = (
                f"Not enough eligible TMDB candidates after excluding watched films "
                f"({len(scored)} candidate{'s' if len(scored) != 1 else ''} available)."
            )
        output = {
            "user": username,
            "source_files": {
                "wrapped": str(wrapped_path.relative_to(BASE_DIR)),
                "profile_metrics": str(metrics_path.relative_to(BASE_DIR)),
                "tmdb_candidates_cache": "data/cache/tmdb_candidates_cache.json",
            },
            "recommendations": [],
            "unavailable_reason": reason,
            "candidate_pool_stats": pool_stats,
            "scoring_notes": [
                "Recommendations are optional and may be unavailable for small or sparse profiles.",
            ],
        }
        out_json = OUTPUT_DIR / f"{username}_recommendations.json"
        out_md = OUTPUT_DIR / f"{username}_recommendations_report.md"
        out_json.write_text(json.dumps(output, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")
        out_md.write_text(render_report(output), encoding="utf-8")
        return out_json, out_md

    chosen, diversity_checks = select_diverse_recommendations(scored, context)

    notable_eligibility_excluded = [
        item for item in eligibility_excluded if "twin peaks" in normalize_title(item.get("title"))
    ]

    output = {
        "user": username,
        "source_files": {
            "wrapped": str(wrapped_path.relative_to(BASE_DIR)),
            "profile_metrics": str(metrics_path.relative_to(BASE_DIR)),
            "tmdb_candidates_cache": "data/cache/tmdb_candidates_cache.json",
        },
        "recommendations": chosen,
        "diversity_checks": diversity_checks,
        "eligibility_excluded": eligibility_excluded[:100],
        "notable_eligibility_excluded": notable_eligibility_excluded,
        "candidate_pool_stats": pool_stats,
        "scoring_notes": [
            f"Candidates come from a live TMDB pool (seed similar/recommendations, profile-based discover, "
            f"now_playing/upcoming/trending) not present in the user's last {len(films)} RSS films.",
            "safe_pick (\"La Pépite\"): strong genre/country/director proximity, low popularity within this "
            "run's pool, released 3+ years ago.",
            "wild_card (\"Le Pari\"): departs from usual habits, well-rated with enough votes to trust the "
            "rating, popularity a notch above safe_pick, released this year or last.",
            "deep_cut (\"Le Détour\"): a production country the user hasn't seen yet, filtered to picks that "
            "still fit their usual genre/country taste, with a quality floor.",
            "Each slot relaxes its own criteria progressively (popularity/date first, thematic proximity "
            "preserved longest) if nothing satisfies the full criteria -- see candidate_pool_stats and "
            "diversity_checks.relaxation_used (0 = no relaxation needed).",
        ],
    }

    out_json = OUTPUT_DIR / f"{username}_recommendations.json"
    out_md = OUTPUT_DIR / f"{username}_recommendations_report.md"
    out_json.write_text(json.dumps(output, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")
    out_md.write_text(render_report(output), encoding="utf-8")
    return out_json, out_md


def render_report(output: dict[str, Any]) -> str:
    lines = [
        f"# Recommendations for {output['user']}",
        "",
        "## Scoring notes",
        "",
    ]
    lines.extend(f"- {note}" for note in output["scoring_notes"])
    diversity = output.get("diversity_checks") or {}
    recommendations = output.get("recommendations") or []
    popularities = diversity.get("popularity") or []
    lines.extend(["", "## Slot rationale", ""])
    for index, rec in enumerate(recommendations):
        countries = rec.get("countries") or []
        non_us_label = "non-USA" if any(country != "USA" for country in countries) else "USA"
        popularity = popularities[index] if index < len(popularities) else "unknown"
        relaxation = (diversity.get("relaxation_used") or {}).get(rec.get("slot"), 0)
        if rec.get("slot") == "safe_pick":
            role = "low-popularity, older pick close to the user's usual genres/countries (\"La Pépite\")."
        elif rec.get("slot") == "deep_cut":
            role = "a production country new to the user, filtered to stay close to their usual taste (\"Le Détour\")."
        else:
            role = "recent, well-rated pick that departs a bit from usual habits (\"Le Pari\")."
        lines.extend([
            f"- {rec.get('slot')}: {rec.get('title')} — {role}",
            f"  Countries: {', '.join(countries) or 'Unknown'} ({non_us_label}).",
            f"  Primary genres: {', '.join((rec.get('genres') or [])[:2]) or 'Unknown'}.",
            f"  Popularity: {popularity} (tmdb_vote_count={rec.get('tmdb_vote_count')}).",
            f"  Relaxation steps used: {relaxation} (0 = full criteria satisfied).",
            f"  Difference: director={rec.get('director')}, runtime={rec.get('runtime')}, year={rec.get('year')}.",
        ])
    lines.extend([
        "",
        "## Diversity checks",
        "",
        f"- Distinct directors: {'yes' if diversity.get('distinct_directors') else 'no'}",
        f"- Non-USA recommendation found: {'yes' if diversity.get('non_us_recommendation_found') else 'no'}",
        "- Directors: " + ", ".join(str(value) for value in diversity.get("directors", [])),
        "- Primary genres: "
        + " | ".join(", ".join(str(genre) for genre in genres) for genres in diversity.get("primary_genres", [])),
    ])
    rejected = diversity.get("rejected") or []
    director_rejects = [item for item in rejected if item.get("reason") == "duplicate_director"]
    proximity_rejects = [item for item in rejected if item.get("reason") == "title_or_franchise_proximity"]
    lines.append(
        "- Duplicate director rejections: "
        + (
            ", ".join(f"{item.get('title')} ({item.get('director')})" for item in director_rejects)
            if director_rejects
            else "None"
        )
    )
    lines.append(
        "- Title/franchise proximity rejections: "
        + (
            ", ".join(str(item.get("title")) for item in proximity_rejects)
            if proximity_rejects
            else "None"
        )
    )
    if rejected:
        lines.extend(["", "### Rejected candidates", ""])
        lines.extend(
            f"- {item.get('slot')}: {item.get('title')} | {item.get('director')} | {', '.join(item.get('countries') or [])} | {item.get('score')} | {item.get('reason')}"
            for item in rejected[:20]
        )
    excluded = output.get("eligibility_excluded") or []
    notable_excluded = output.get("notable_eligibility_excluded") or []
    if notable_excluded:
        lines.extend(["", "### Notable eligibility exclusions", ""])
        lines.extend(
            f"- {item.get('title')} | {item.get('slug')} | {item.get('reason')}"
            for item in notable_excluded
        )
    if excluded:
        lines.extend(["", "### Eligibility exclusions", ""])
        lines.extend(
            f"- {item.get('title')} | {item.get('slug')} | {item.get('reason')}"
            for item in excluded[:20]
        )
    lines.extend(["", "## Picks", ""])
    for rec in output["recommendations"]:
        lines.extend([
            f"### {rec['slot']}: {rec['title']}",
            "",
            f"- Score: {rec['score']}",
            f"- Year: {rec['year']}",
            f"- Slug: {rec['slug']}",
            f"- Genres: {', '.join(rec['genres'])}",
            f"- Countries: {', '.join(rec['countries'])}",
            f"- Director: {rec['director']}",
            f"- Reason codes: {', '.join(rec['reason_codes'])}",
            f"- Reason: {rec['reason_text']}",
            "",
        ])
    return "\n".join(lines)


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python scripts/build_recommendations.py <letterboxd_username>")
        raise SystemExit(2)
    out_json, out_md = build_recommendations(sys.argv[1])
    print(f"Wrote {out_json}")
    print(f"Wrote {out_md}")


if __name__ == "__main__":
    main()
