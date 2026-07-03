"""Build a UI-ready MyFiftyTaste display profile from wrapped metrics.

Usage:
    python scripts/build_display_profile.py <letterboxd_username>

Inputs:
    data/output/<username>_wrapped.json
    data/output/<username>_profile_metrics.json

Outputs:
    data/output/<username>_display_profile.json
    data/output/<username>_display_profile_report.md
"""

from __future__ import annotations

import json
import math
import os
import re
import sys
import unicodedata
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Optional

import requests
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "data" / "output"
CACHE_DIR = BASE_DIR / "data" / "cache"
DISPLAY_CONFIG_JSON = BASE_DIR / "data" / "config" / "display_config.json"
RADAR_ARCHETYPES_JSON = BASE_DIR / "data" / "config" / "radar_archetypes_20.json"
SUPPLEMENTAL_JSON = BASE_DIR / "data" / "processed" / "supplemental_metadata.json"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"

DEFAULT_CARD_ORDER = [
    "rating_personality",
    "reviewness",
    "runtime_profile",
    "country_passport",
]

DEFAULT_CONFIG = {
    "card_order": DEFAULT_CARD_ORDER,
    "archetypes": {
        "demanding_explorer": {
            "name": "demanding_explorer",
            "subtitle": "",
            "one_liner": "",
        },
        "cult_romantic": {"name": "cult_romantic", "subtitle": "", "one_liner": ""},
        "deep_cut_hunter": {"name": "deep_cut_hunter", "subtitle": "", "one_liner": ""},
        "balanced_cinephile": {
            "name": "balanced_cinephile",
            "subtitle": "",
            "one_liner": "",
        },
    },
    "cards": {},
    "cards_section": {
        "eyebrow": "SYNTHÈSE",
        "title": "En bref…",
        "confidence_labels": {
            "high": "FIABLE",
            "medium": "MOYEN",
            "low": "FAIBLE",
        },
    },
    "highlights": {
        "eyebrow": "HIGHLIGHTS",
        "title": "Toi, en 5 films et 1 réal",
        "labels": {
            "most_niche": "Le plus niche",
            "most_mainstream": "Le plus mainstream",
            "most_cult": "Le plus culte",
            "longest": "Le plus long",
            "shortest": "Le plus court",
            "most_repeated_director": "Ton réalisateur récurrent",
        },
    },
    "recommendations": {
        "eyebrow": "RECOMMANDATIONS",
        "title": "Trois recos pour la suite, à voir ou revoir",
        "subtitle_template": "Des recommandations calculées à partir de tes {detected_films_count} films détectés, sans IA.",
        "unavailable_text": "Recommandations indisponibles pour ce profil.",
        "slot_labels": {
            "safe_pick": "Le choix sûr",
            "deep_cut": "Le détour",
            "wild_card": "Le pari",
        },
        "slot_descriptions": {
            "safe_pick": "Un film populaire proche de tes genres préférés.",
            "deep_cut": "Un film moins évident, retenu car proche de tes habitudes mais un peu moins célèbre.",
            "wild_card": "Un film plus décalé, il change d’angle tout en restant proche de tes thèmes d’affection.",
        },
    },
    "data_sources": {
        "social": "{count} social films",
        "metadata": "{count} metadata films",
        "rss": "{count} films from Letterboxd RSS",
    },
    "warnings": {
        "low_social_coverage": "Low social coverage.",
        "manual_metadata_validation": "Manual metadata validation pending.",
    },
}

REQUIRED_CONFIG_PATHS = [
    ("card_order",),
    ("cards_section", "eyebrow"),
    ("cards_section", "title"),
    ("cards_section", "confidence_labels", "high"),
    ("cards_section", "confidence_labels", "medium"),
    ("cards_section", "confidence_labels", "low"),
    ("archetypes", "demanding_explorer", "name"),
    ("archetypes", "demanding_explorer", "subtitle"),
    ("archetypes", "demanding_explorer", "one_liner"),
    ("archetypes", "cult_romantic", "name"),
    ("archetypes", "cult_romantic", "subtitle"),
    ("archetypes", "cult_romantic", "one_liner"),
    ("archetypes", "deep_cut_hunter", "name"),
    ("archetypes", "deep_cut_hunter", "subtitle"),
    ("archetypes", "deep_cut_hunter", "one_liner"),
    ("archetypes", "balanced_cinephile", "name"),
    ("archetypes", "balanced_cinephile", "subtitle"),
    ("archetypes", "balanced_cinephile", "one_liner"),
    ("cards", "rating_personality", "title_variants", "below"),
    ("cards", "rating_personality", "title_variants", "close"),
    ("cards", "rating_personality", "title_variants", "above"),
    ("cards", "rating_personality", "description_templates", "no_data"),
    ("cards", "rating_personality", "description_templates", "close"),
    ("cards", "rating_personality", "description_templates", "below"),
    ("cards", "rating_personality", "description_templates", "above"),
    ("cards", "niche_profile", "title"),
    ("cards", "niche_profile", "label"),
    ("cards", "niche_profile", "description"),
    ("cards", "cult_profile", "title"),
    ("cards", "cult_profile", "label"),
    ("cards", "cult_profile", "description"),
    ("cards", "reviewness", "title"),
    ("cards", "reviewness", "description_templates", "rarely"),
    ("cards", "reviewness", "description_templates", "occasionally"),
    ("cards", "reviewness", "description_templates", "often"),
    ("cards", "runtime_profile", "title"),
    ("cards", "runtime_profile", "description_template"),
    ("cards", "genre_dna", "title"),
    ("cards", "genre_dna", "label_template"),
    ("cards", "genre_dna", "description_template"),
    ("cards", "country_passport", "title"),
    ("cards", "country_passport", "description_template"),
    ("cards", "director_recurrence", "title"),
    ("cards", "director_recurrence", "label_template"),
    ("cards", "director_recurrence", "description"),
    ("recommendations", "eyebrow"),
    ("recommendations", "title"),
    ("recommendations", "subtitle_template"),
    ("recommendations", "unavailable_text"),
    ("recommendations", "slot_labels", "safe_pick"),
    ("recommendations", "slot_labels", "deep_cut"),
    ("recommendations", "slot_labels", "wild_card"),
    ("recommendations", "slot_descriptions", "safe_pick"),
    ("recommendations", "slot_descriptions", "deep_cut"),
    ("recommendations", "slot_descriptions", "wild_card"),
    ("data_sources", "social"),
    ("data_sources", "metadata"),
    ("data_sources", "rss"),
    ("warnings", "low_social_coverage"),
    ("warnings", "manual_metadata_validation"),
]


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


def pct(value: Any, digits: int = 0) -> Optional[str]:
    number = safe_float(value)
    if number is None:
        return None
    return f"{number:.{digits}%}"


def french_pct(value: Any, digits: int = 0) -> Optional[str]:
    value_as_pct = pct(value, digits)
    return value_as_pct.replace("%", " %") if value_as_pct else value_as_pct


def number(value: Any, digits: int = 1) -> Optional[str]:
    parsed = safe_float(value)
    if parsed is None:
        return None
    if digits == 0:
        return str(int(round(parsed)))
    return f"{parsed:.{digits}f}"


def title_case_label(value: Any) -> str:
    if value is None:
        return "Unknown"
    return str(value).replace("-", " ").title()


def image_url(path: Any, size: str) -> Optional[str]:
    if not path:
        return None
    value = str(path)
    if value.startswith("http://") or value.startswith("https://"):
        return value
    if not value.startswith("/"):
        value = "/" + value
    return f"{TMDB_IMAGE_BASE}/{size}{value}"


def load_json_file(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def save_json_file(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def extract_title_year_from_rss(value: Any) -> tuple[Optional[str], Optional[int]]:
    text = str(value or "").strip()
    if not text:
        return None, None
    match = re.match(r"^(?P<title>.*),\s*(?P<year>\d{4})(?:\s*-.*)?$", text)
    if match:
        return match.group("title").strip(), int(match.group("year"))
    year_match = re.search(r"(?:^|[^\d])((?:18|19|20)\d{2})(?:[^\d]|$)", text)
    year = int(year_match.group(1)) if year_match else None
    title = text[: year_match.start(1)].strip(" ,-") if year_match else text
    return title or text, year


def tmdb_year(payload: dict[str, Any]) -> Optional[int]:
    date = payload.get("release_date")
    if not date:
        return None
    match = re.match(r"^(\d{4})", str(date))
    return int(match.group(1)) if match else None


def normalize_for_match(value: Any) -> str:
    text = str(value or "").lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def title_confidence(expected_title: str, candidate: dict[str, Any]) -> float:
    expected = normalize_for_match(expected_title)
    titles = [
        normalize_for_match(candidate.get("title")),
        normalize_for_match(candidate.get("original_title")),
    ]
    scores = []
    for title in titles:
        if not expected or not title:
            continue
        if expected == title:
            scores.append(1.0)
        else:
            scores.append(SequenceMatcher(None, expected, title).ratio())
    return max(scores) if scores else 0.0


def verify_tmdb_candidate(
    candidate: dict[str, Any],
    expected_title: Optional[str],
    expected_year: Optional[int],
    source: str,
) -> dict[str, Any]:
    candidate_year = tmdb_year(candidate)
    confidence = title_confidence(expected_title or "", candidate)
    year_delta = abs(candidate_year - expected_year) if candidate_year and expected_year else None
    year_ok = year_delta is not None and year_delta <= 1
    verified = confidence >= 0.88 and year_ok
    return {
        "status": "verified" if verified else "ambiguous",
        "source": source,
        "match": {
            "tmdb_id": candidate.get("id") or candidate.get("tmdb_id"),
            "tmdb_title": candidate.get("title"),
            "tmdb_original_title": candidate.get("original_title"),
            "tmdb_year": candidate_year,
            "expected_title": expected_title,
            "expected_year": expected_year,
            "confidence": round(confidence, 4),
            "year_delta": year_delta,
        },
    }


def media_fields_from_verified_candidate(
    candidate: dict[str, Any],
    verification: dict[str, Any],
) -> dict[str, Any]:
    poster_path = candidate.get("poster_path")
    backdrop_path = candidate.get("backdrop_path")
    is_verified = verification.get("status") == "verified"
    return {
        "tmdb_id": candidate.get("id") or candidate.get("tmdb_id"),
        "poster_path": poster_path if is_verified else None,
        "poster_url": image_url(poster_path, "w500") if is_verified and poster_path else None,
        "backdrop_path": backdrop_path if is_verified else None,
        "backdrop_url": image_url(backdrop_path, "w780") if is_verified and backdrop_path else None,
        "poster_status": "verified" if is_verified and poster_path else ("missing" if is_verified else "ambiguous"),
        "poster_source": verification.get("source"),
        "poster_match": verification.get("match"),
    }


def tmdb_details_by_id(
    tmdb_id: Any,
    api_key: Optional[str],
    details_cache: dict[str, Any],
) -> Optional[dict[str, Any]]:
    if not tmdb_id:
        return None
    cache_key = str(tmdb_id)
    cached = details_cache.get(cache_key)
    if isinstance(cached, dict):
        return cached
    if not api_key:
        return None
    try:
        response = requests.get(
            f"https://api.themoviedb.org/3/movie/{int(tmdb_id)}",
            # Credits are metadata, not presentation data.  Always request them
            # together with details so a cached record can feed both posters and
            # directors without a second lookup.
            params={"api_key": api_key, "append_to_response": "credits"},
            timeout=10,
        )
        response.raise_for_status()
    except Exception:
        return None
    details = response.json()
    details_cache[cache_key] = details
    return details


def director_names_from_details(details: Optional[dict[str, Any]]) -> list[str]:
    """Return TMDB's credited directors, in the order supplied by TMDB."""
    if not isinstance(details, dict):
        return []
    credits = details.get("credits")
    crew = credits.get("crew") if isinstance(credits, dict) else None
    if not isinstance(crew, list):
        return []
    directors: list[str] = []
    for person in crew:
        if not isinstance(person, dict) or person.get("job") != "Director":
            continue
        name = person.get("name")
        if isinstance(name, str) and name.strip() and name not in directors:
            directors.append(name)
    return directors


def tmdb_search_candidates(
    title: str,
    year: Optional[int],
    api_key: Optional[str],
    search_cache: dict[str, Any],
) -> list[dict[str, Any]]:
    cache_key = f"strict:v2:{title.strip().lower()}|{year or ''}"
    cached = search_cache.get(cache_key)
    if isinstance(cached, list):
        return [item for item in cached if isinstance(item, dict)]
    if not api_key:
        return []

    strategies: list[dict[str, Any]] = [{"query": title}]
    if year:
        strategies.insert(0, {"query": title, "year": year})
        strategies.insert(1, {"query": title, "primary_release_year": year})

    merged: list[dict[str, Any]] = []
    seen_ids: set[Any] = set()
    for params in strategies:
        try:
            response = requests.get(
                "https://api.themoviedb.org/3/search/movie",
                params={**params, "api_key": api_key},
                timeout=10,
            )
            response.raise_for_status()
        except Exception:
            continue
        for result in response.json().get("results") or []:
            tmdb_id = result.get("id")
            if tmdb_id in seen_ids:
                continue
            seen_ids.add(tmdb_id)
            merged.append(result)

    search_cache[cache_key] = merged
    return merged


def expected_title_year(item: dict[str, Any]) -> tuple[Optional[str], Optional[int]]:
    title = item.get("title")
    year = safe_float(item.get("year"))
    extracted_title, extracted_year = extract_title_year_from_rss(item.get("rss_title"))
    return title or extracted_title, int(year) if year else extracted_year


def letterboxd_person_slug(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name)
    ascii_name = "".join(char for char in normalized if not unicodedata.combining(char))
    ascii_name = ascii_name.replace("'", "").replace("’", "")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_name.lower())
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


def resolve_poster_for_seen_film(item: dict[str, Any], title: Optional[str], year: Optional[int], slug: Optional[str]) -> Optional[dict[str, Any]]:
    """Use the exact Letterboxd RSS poster before any external poster lookup."""
    rss_poster_url = item.get("letterboxd_poster_url") or item.get("rss_poster_url")
    if not rss_poster_url:
        return None
    return {
        "poster_path": None,
        "poster_url": rss_poster_url,
        "backdrop_path": None,
        "backdrop_url": None,
        "poster_status": "verified",
        "poster_source": "letterboxd_rss",
        "poster_match": {
            "letterboxd_slug": slug,
            "expected_title": title,
            "expected_year": year,
            "confidence": 1.0,
        },
    }


def enrich_media_item(
    item: Optional[dict[str, Any]],
    supplemental: dict[str, Any],
    search_cache: dict[str, Any],
    details_cache: dict[str, Any],
    api_key: Optional[str],
) -> Optional[dict[str, Any]]:
    if not isinstance(item, dict):
        return item
    enriched = dict(item)
    title, year = expected_title_year(enriched)
    slug = enriched.get("slug") or enriched.get("letterboxd_slug")
    supplemental_payload = supplemental.get(str(slug)) if slug else None

    # Director resolution intentionally runs before poster resolution: a seen
    # film's Letterboxd RSS poster is authoritative for its image, but says
    # nothing about its crew.
    director_source = None
    directors = enriched.get("directors")
    director = enriched.get("director")
    if isinstance(director, str) and director.strip():
        directors = [director] + [value for value in directors or [] if value != director]
        director_source = enriched.get("director_source") or "film_normalized"
    elif isinstance(directors, list) and any(isinstance(value, str) and value.strip() for value in directors):
        directors = [value for value in directors if isinstance(value, str) and value.strip()]
        director = directors[0]
        director_source = enriched.get("director_source") or "film_normalized"
    else:
        directors = []
        supplemental_directors = (
            supplemental_payload.get("directors")
            if isinstance(supplemental_payload, dict)
            else None
        )
        if isinstance(supplemental_directors, list):
            directors = [value for value in supplemental_directors if isinstance(value, str) and value.strip()]
            if directors:
                director_source = "supplemental"

        confirmed_tmdb_id = (
            (supplemental_payload or {}).get("tmdb_id")
            if isinstance(supplemental_payload, dict)
            else enriched.get("tmdb_id")
        )
        details = tmdb_details_by_id(confirmed_tmdb_id, api_key, details_cache) if confirmed_tmdb_id else None
        if not directors and details:
            directors = director_names_from_details(details)
            if directors:
                director_source = "tmdb_details"
        if not directors and title and year is not None:
            # A strict title + year search is used only when no confirmed TMDB
            # identifier is available.  The same verification gate used for
            # poster matching prevents homonym metadata from leaking in.
            candidates = tmdb_search_candidates(str(title), year, api_key, search_cache)
            verified = [
                candidate
                for candidate in candidates
                if verify_tmdb_candidate(candidate, str(title), year, "tmdb_search").get("status") == "verified"
            ]
            if verified:
                candidate = max(verified, key=lambda value: value.get("popularity") or 0)
                details = tmdb_details_by_id(candidate.get("id"), api_key, details_cache)
                directors = director_names_from_details(details)
                if directors:
                    enriched["tmdb_id"] = candidate.get("id")
                    director_source = "tmdb_search_details"

    enriched["directors"] = directors
    enriched["director"] = directors[0] if directors else None
    enriched["director_source"] = director_source
    seen_poster = resolve_poster_for_seen_film(enriched, title, year, slug)
    if seen_poster:
        enriched.update(seen_poster)
        return enriched

    if isinstance(supplemental_payload, dict) and supplemental_payload.get("tmdb_id"):
        details = tmdb_details_by_id(supplemental_payload.get("tmdb_id"), api_key, details_cache)
        if details:
            verification = verify_tmdb_candidate(details, title, year, "tmdb_supplemental_id")
            enriched.update(media_fields_from_verified_candidate(details, verification))
            if verification["status"] == "verified" and not details.get("poster_path"):
                enriched["poster_status"] = "missing"
            return enriched
        enriched.update({
            "tmdb_id": supplemental_payload.get("tmdb_id"),
            "poster_status": "missing",
            "poster_source": "tmdb_supplemental_id",
            "poster_match": {
                "tmdb_id": supplemental_payload.get("tmdb_id"),
                "expected_title": title,
                "expected_year": year,
                "confidence": supplemental_payload.get("tmdb_score"),
            },
        })
        return enriched

    if not title or year is None:
        enriched.update({
            "poster_status": "missing",
            "poster_source": None,
            "poster_match": None,
        })
        return enriched

    candidates = tmdb_search_candidates(str(title), year, api_key, search_cache)
    verified: list[tuple[dict[str, Any], dict[str, Any]]] = []
    ambiguous: list[dict[str, Any]] = []
    for candidate in candidates:
        verification = verify_tmdb_candidate(candidate, str(title), year, "tmdb_search")
        if verification["status"] == "verified":
            verified.append((candidate, verification))
        else:
            ambiguous.append(verification["match"])

    if verified:
        candidate, verification = max(
            verified,
            key=lambda pair: (
                bool(pair[0].get("poster_path")),
                pair[1]["match"].get("confidence") or 0,
                pair[0].get("popularity") or 0,
            ),
        )
        enriched.update(media_fields_from_verified_candidate(candidate, verification))
        if not candidate.get("poster_path"):
            enriched["poster_status"] = "missing"
        return enriched

    enriched.update({
        "poster_status": "ambiguous" if candidates else "missing",
        "poster_source": "tmdb_search" if candidates else None,
        "poster_match": ambiguous[0] if ambiguous else None,
        "poster_rejections": ambiguous[:5],
    })
    return enriched


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def has_path(data: dict[str, Any], path: tuple[str, ...]) -> bool:
    current: Any = data
    for part in path:
        if not isinstance(current, dict) or part not in current:
            return False
        current = current[part]
    return True


def load_display_config() -> tuple[dict[str, Any], list[str]]:
    fallback_warnings: list[str] = []
    if not DISPLAY_CONFIG_JSON.exists():
        fallback_warnings.append(
            f"Missing {DISPLAY_CONFIG_JSON.relative_to(BASE_DIR)}; using default display fallbacks."
        )
        return DEFAULT_CONFIG, fallback_warnings
    try:
        loaded = json.loads(DISPLAY_CONFIG_JSON.read_text(encoding="utf-8"))
    except Exception as exc:
        fallback_warnings.append(
            f"Could not parse {DISPLAY_CONFIG_JSON.relative_to(BASE_DIR)} ({exc}); using default display fallbacks."
        )
        return DEFAULT_CONFIG, fallback_warnings
    if not isinstance(loaded, dict):
        fallback_warnings.append(
            f"{DISPLAY_CONFIG_JSON.relative_to(BASE_DIR)} is not a JSON object; using default display fallbacks."
        )
        return DEFAULT_CONFIG, fallback_warnings
    for path in REQUIRED_CONFIG_PATHS:
        if not has_path(loaded, path):
            fallback_warnings.append(
                "Missing display_config key: " + ".".join(path)
            )
    return deep_merge(DEFAULT_CONFIG, loaded), fallback_warnings


def load_radar_archetypes() -> tuple[dict[str, Any], list[str]]:
    warnings: list[str] = []
    if not RADAR_ARCHETYPES_JSON.exists():
        return {}, [f"Missing {RADAR_ARCHETYPES_JSON.relative_to(BASE_DIR)}."]
    try:
        data = json.loads(RADAR_ARCHETYPES_JSON.read_text(encoding="utf-8"))
    except Exception as exc:
        return {}, [f"Could not parse {RADAR_ARCHETYPES_JSON.relative_to(BASE_DIR)} ({exc})."]
    if not isinstance(data, dict):
        return {}, [f"{RADAR_ARCHETYPES_JSON.relative_to(BASE_DIR)} is not a JSON object."]

    total_levels = 0
    for axis_id, axis in data.items():
        if not isinstance(axis, dict):
            warnings.append(f"Invalid radar archetype axis: {axis_id}")
            continue
        levels = axis.get("levels")
        if not isinstance(levels, dict):
            warnings.append(f"Missing radar archetype levels: {axis_id}")
            continue
        total_levels += len(levels)
        for level in range(1, 6):
            payload = levels.get(str(level))
            if not isinstance(payload, dict):
                warnings.append(f"Missing radar archetype level: {axis_id}.{level}")
                continue
            if not payload.get("title") or not payload.get("one_line"):
                warnings.append(f"Incomplete radar archetype level: {axis_id}.{level}")
    if total_levels != 20:
        warnings.append(f"Expected 20 radar archetype levels, found {total_levels}.")
    return data, warnings


def template(text: Optional[str], values: dict[str, Any], fallback: str = "") -> str:
    if not text:
        return fallback
    try:
        return text.format(**values)
    except Exception:
        return fallback or text


def film_ref(film: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if not film:
        return None
    directors = film.get("directors") if isinstance(film.get("directors"), list) else []
    director = film.get("director") or (directors[0] if directors else None)
    return {
        "title": film.get("title") or film.get("rss_title"),
        "rss_title": film.get("rss_title"),
        "slug": film.get("letterboxd_slug"),
        "url": film.get("letterboxd_url"),
        "source": film.get("source"),
        "year": film.get("year"),
        "director": director,
        "directors": directors,
        "director_source": film.get("director_source") or ("film_normalized" if director else None),
        "rss_poster_url": film.get("rss_poster_url"),
        "letterboxd_poster_url": film.get("letterboxd_poster_url"),
        "tmdb_id": film.get("tmdb_id"),
        "poster_path": film.get("poster_path"),
        "poster_url": film.get("poster_url"),
        "backdrop_path": film.get("backdrop_path"),
        "backdrop_url": film.get("backdrop_url"),
    }


def configured_data_source(config: dict[str, Any], source_id: str, count: Any) -> str:
    source_templates = config.get("data_sources") or {}
    fallback = f"{count} {source_id} films"
    return template(source_templates.get(source_id), {"count": count}, fallback)


def confidence_for_count(count: Any, high: int, medium: int = 10) -> str:
    value = int(safe_float(count) or 0)
    if value >= high:
        return "high"
    if value >= medium:
        return "medium"
    return "low"


def profile_quality_from_coverage(coverage: dict[str, Any]) -> dict[str, Any]:
    quality = coverage.get("profile_quality")
    if isinstance(quality, dict):
        return quality
    count = int(coverage.get("total_films_analyzed") or 0)
    if count <= 0:
        status = "impossible"
        warning = "Aucun film détecté. Le profil ne peut pas être calculé."
    elif count < 10:
        status = "very_limited"
        warning = (
            f"Profil très limité : seulement {count} films détectés. "
            "Certaines sections peuvent être indisponibles."
        )
    elif count < 50:
        status = "partial"
        warning = (
            f"Profil calculé sur {count} films détectés. C’est assez pour esquisser "
            "une tendance, mais certaines conclusions peuvent encore bouger avec plus de films."
        )
    else:
        status = "normal"
        warning = None
    return {
        "detected_films_count": count,
        "target_films_count": 50,
        "status": status,
        "is_partial": 0 < count < 50,
        "warning": warning,
    }


def load_recommendations(username: str) -> list[dict[str, Any]]:
    data = load_recommendations_payload(username)
    recommendations = data.get("recommendations") if isinstance(data, dict) else None
    return recommendations if isinstance(recommendations, list) else []


def load_recommendations_payload(username: str) -> dict[str, Any]:
    recommendations_path = OUTPUT_DIR / f"{username}_recommendations.json"
    if not recommendations_path.exists():
        return {}
    try:
        data = json.loads(recommendations_path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def choose_archetype_id(metrics: dict[str, Any]) -> str:
    rating_label = metrics.get("rating_personality", {}).get("label")
    country_label = metrics.get("country_passport", {}).get("label")
    cult_index = safe_float(metrics.get("cult_profile", {}).get("cult_index")) or 0
    niche_index = safe_float(metrics.get("niche_profile", {}).get("niche_index")) or 0

    if rating_label == "severe" and country_label == "world cinema explorer":
        return "demanding_explorer"
    if rating_label == "generous" and cult_index > 70:
        return "cult_romantic"
    if niche_index > 60:
        return "deep_cut_hunter"
    return "balanced_cinephile"


def archetype_copy(config: dict[str, Any], archetype_id: str) -> dict[str, str]:
    archetype = (config.get("archetypes") or {}).get(archetype_id) or {}
    return {
        "id": archetype_id,
        "name": archetype.get("name") or archetype_id,
        "subtitle": archetype.get("subtitle") or "",
        "one_liner": archetype.get("one_liner") or "",
    }


def rating_card_copy(diff: Any, card_config: dict[str, Any]) -> tuple[str, str]:
    value = safe_float(diff)
    templates = card_config.get("description_templates") or {}
    titles = card_config.get("title_variants") or {}
    if value is None:
        return (
            titles.get("no_data") or "Notation",
            templates.get("no_data") or "No rating comparison available.",
        )
    absolute = abs(value)
    if absolute < 0.1:
        return (
            titles.get("close") or "Juste",
            templates.get("close") or "Ratings are close to the crowd.",
        )
    variant = "above" if value > 0 else "below"
    return (
        titles.get(variant) or "Notation",
        template(
            templates.get(variant),
            {"abs_rating_gap": f"{absolute:.2f}".replace(".", ",")},
            f"{absolute:.2f} stars from the crowd.",
        ),
    )


def review_description(review_count: Any, card_config: dict[str, Any]) -> str:
    count = int(safe_float(review_count) or 0)
    templates = card_config.get("description_templates") or {}
    variant = "often" if count >= 33 else "occasionally" if count >= 12 else "rarely"
    return str(templates.get(variant) or "")


def format_duration(minutes: Any) -> Optional[str]:
    value = safe_float(minutes)
    if value is None or value <= 0:
        return None
    total_minutes = int(round(value))
    hours, remaining_minutes = divmod(total_minutes, 60)
    return f"{hours}h{remaining_minutes:02d}" if hours else f"{remaining_minutes} min"


COUNTRY_DISPLAY_NAMES_FR = {
    "USA": "Les États-Unis",
    "France": "La France",
    "Japan": "Le Japon",
    "UK": "Le Royaume-Uni",
    "Spain": "L’Espagne",
    "Italy": "L’Italie",
    "South Korea": "La Corée du Sud",
    "Sweden": "La Suède",
    "Canada": "Le Canada",
    "Ireland": "L’Irlande",
}


def country_display_name_fr(country: Any) -> str:
    name = str(country or "")
    return COUNTRY_DISPLAY_NAMES_FR.get(name, name)


def country_display_verb_fr(country: Any) -> str:
    return "représentent" if str(country or "") == "USA" else "représente"


def build_cards(metrics: dict[str, Any], config: dict[str, Any]) -> list[dict[str, Any]]:
    coverage = metrics["coverage"]
    detected_films_count = int(coverage.get("total_films_analyzed") or 0)
    social_source = configured_data_source(
        config, "social", coverage["social_films_count"]
    )
    comparable_rating_source = configured_data_source(
        config,
        "rating_comparable",
        (metrics.get("rating_personality") or {}).get("paired_count"),
    )
    metadata_source = configured_data_source(
        config, "metadata", coverage["confirmed_metadata_films_count"]
    )
    runtime_source = configured_data_source(
        config,
        "runtime",
        (metrics.get("runtime_profile") or {}).get("runtime_included_count"),
    )
    rss_source = configured_data_source(config, "rss", detected_films_count)
    card_config = config.get("cards") or {}
    confidence_labels = (config.get("cards_section") or {}).get("confidence_labels") or {}

    def display_confidence(value: Any) -> str:
        confidence = str(value or "low")
        return str(confidence_labels.get(confidence) or confidence.upper())

    rating = metrics["rating_personality"]
    niche = metrics["niche_profile"]
    cult = metrics["cult_profile"]
    reviewness = (metrics.get("radar_scores") or {}).get("reviewness") or {}
    runtime = metrics["runtime_profile"]
    genre = metrics["genre_dna"]
    country = metrics["country_passport"]
    directors = metrics["director_recurrence"]
    repeated = directors.get("most_repeated_director") or {}
    rating_gap = rating.get("paired_average_difference")
    if rating_gap is None:
        rating_gap = rating.get("average_difference")
    rating_title, rating_card_description = rating_card_copy(
        rating_gap, card_config.get("rating_personality") or {}
    )
    runtime_formatted = format_duration(runtime.get("runtime_average"))
    country_map_entries = (metrics.get("country_map") or {}).get("countries") or []
    dominant_country = country.get("dominant_country")
    dominant_country_entry = next(
        (
            entry for entry in country_map_entries
            if isinstance(entry, dict) and entry.get("name") == dominant_country
        ),
        {},
    )

    context = {
        "rating_label": title_case_label(rating.get("label")),
        "runtime_label": title_case_label(runtime.get("label")),
        "dominant_genre_share": pct(genre.get("dominant_genre_share")),
        "genre_diversity_count": genre.get("genre_diversity_count"),
        "country_label": title_case_label(country.get("label")),
        "non_us_share": french_pct(country.get("non_us_share")),
        "repeat_count": repeated.get("count", 0),
        "reviewness_label": reviewness.get("label") or "",
        "reviewness_description": reviewness.get("description") or "",
        "duration_formatted": runtime_formatted or "n/a",
        "country_article_name": country_display_name_fr(dominant_country),
        "country_verb": country_display_verb_fr(dominant_country),
        "dominant_country_share": french_pct(dominant_country_entry.get("share")) or "n/a",
    }

    def card_text(card_id: str, key: str, fallback: str) -> str:
        return (card_config.get(card_id) or {}).get(key) or fallback

    def card_template(card_id: str, key: str, fallback: str) -> str:
        value = (card_config.get(card_id) or {}).get(key)
        return template(value, context, fallback)

    cards_by_id = {
        "rating_personality": {
            "id": "rating_personality",
            "title": rating_title,
            "value": number(rating_gap, 2),
            "label": "",
            "description": rating_card_description,
            "confidence": confidence_for_count(rating.get("paired_count"), 25),
            "data_source": comparable_rating_source,
        },
        "niche_profile": {
            "id": "niche_profile",
            "title": card_text("niche_profile", "title", "niche_profile"),
            "value": number(niche.get("niche_index"), 1),
            "label": card_text("niche_profile", "label", "niche_profile"),
            "description": card_text("niche_profile", "description", ""),
            "confidence": confidence_for_count(coverage["social_films_count"], 25),
            "data_source": social_source,
        },
        "cult_profile": {
            "id": "cult_profile",
            "title": card_text("cult_profile", "title", "cult_profile"),
            "value": number(cult.get("cult_index"), 1),
            "label": card_text("cult_profile", "label", "cult_profile"),
            "description": card_text("cult_profile", "description", ""),
            "confidence": confidence_for_count(coverage["social_films_count"], 25),
            "data_source": social_source,
        },
        "reviewness": {
            "id": "reviewness",
            "title": card_text("reviewness", "title", "Reviewness"),
            "value": f"{int(reviewness.get('review_count') or 0)}/{coverage['total_films_analyzed']}",
            "label": "",
            "description": review_description(
                reviewness.get("review_count"), card_config.get("reviewness") or {}
            ),
            "confidence": reviewness.get("confidence") or "high",
            "data_source": rss_source,
        },
        "runtime_profile": {
            "id": "runtime_profile",
            "title": card_text("runtime_profile", "title", "runtime_profile"),
            "value": runtime_formatted,
            "label": "",
            "description": card_template("runtime_profile", "description_template", ""),
            "confidence": confidence_for_count(runtime.get("runtime_included_count"), 40),
            "data_source": runtime_source,
        },
        "genre_dna": {
            "id": "genre_dna",
            "title": card_text("genre_dna", "title", "genre_dna"),
            "value": genre.get("dominant_genre"),
            "label": card_template(
                "genre_dna",
                "label_template",
                f"{context['dominant_genre_share']} of genre tags",
            ),
            "description": card_template("genre_dna", "description_template", ""),
            "confidence": confidence_for_count(coverage["confirmed_metadata_films_count"], 40),
            "data_source": metadata_source,
        },
        "country_passport": {
            "id": "country_passport",
            "title": card_text("country_passport", "title", "country_passport"),
            "value": country.get("dominant_country"),
            "label": "",
            "description": card_template("country_passport", "description_template", ""),
            "confidence": confidence_for_count(coverage["confirmed_metadata_films_count"], 40),
            "data_source": metadata_source,
        },
        "director_recurrence": {
            "id": "director_recurrence",
            "title": card_text("director_recurrence", "title", "director_recurrence"),
            "value": repeated.get("director"),
            "label": card_template(
                "director_recurrence",
                "label_template",
                f"{repeated.get('count', 0)} films",
            ),
            "description": card_text("director_recurrence", "description", ""),
            "confidence": "medium",
            "data_source": metadata_source,
        },
    }

    order = config.get("card_order") or DEFAULT_CARD_ORDER
    cards = [cards_by_id[card_id] for card_id in order if card_id in cards_by_id]
    for card in cards:
        card["confidence_label"] = display_confidence(card.get("confidence"))
    return cards


def build_cards_section_copy(config: dict[str, Any]) -> dict[str, str]:
    section = config.get("cards_section") or {}
    defaults = DEFAULT_CONFIG["cards_section"]
    return {
        "eyebrow": str(section.get("eyebrow") or defaults["eyebrow"]),
        "title": str(section.get("title") or defaults["title"]),
    }


def build_recommendations_copy(config: dict[str, Any]) -> dict[str, Any]:
    recommendation_config = config.get("recommendations") or {}
    defaults = DEFAULT_CONFIG["recommendations"]
    return {
        "eyebrow": recommendation_config.get("eyebrow") or defaults["eyebrow"],
        "title": recommendation_config.get("title") or defaults["title"],
        "subtitle_template": (
            recommendation_config.get("subtitle_template")
            or defaults["subtitle_template"]
        ),
        "unavailable_text": (
            recommendation_config.get("unavailable_text")
            or defaults["unavailable_text"]
        ),
        "slot_labels": {
            **defaults["slot_labels"],
            **(recommendation_config.get("slot_labels") or {}),
        },
        "slot_descriptions": {
            **defaults["slot_descriptions"],
            **(recommendation_config.get("slot_descriptions") or {}),
        },
    }


def build_highlights(metrics: dict[str, Any]) -> dict[str, Any]:
    niche = metrics["niche_profile"]
    cult = metrics["cult_profile"]
    runtime = metrics["runtime_profile"]
    directors = metrics["director_recurrence"]
    repeated_director = directors.get("most_repeated_director")
    if isinstance(repeated_director, dict):
        repeated_director = dict(repeated_director)
        director_name = repeated_director.get("director")
        director_slug = repeated_director.get("director_slug")
        if director_name and not director_slug:
            director_slug = letterboxd_person_slug(str(director_name))
            repeated_director["director_slug"] = director_slug
        if director_slug and not repeated_director.get("letterboxd_url"):
            repeated_director["letterboxd_url"] = f"https://letterboxd.com/director/{director_slug}/"
    return {
        "most_niche": film_ref(niche.get("most_niche_film")),
        "most_mainstream": film_ref(niche.get("most_mainstream_film")),
        "most_cult": film_ref(cult.get("best_cult_film")),
        "longest": film_ref(runtime.get("longest_film")),
        "shortest": film_ref(runtime.get("shortest_film")),
        "most_repeated_director": repeated_director,
    }


def build_highlights_copy(config: dict[str, Any]) -> dict[str, Any]:
    highlight_config = config.get("highlights") or {}
    defaults = DEFAULT_CONFIG["highlights"]
    return {
        "eyebrow": highlight_config.get("eyebrow") or defaults["eyebrow"],
        "title": highlight_config.get("title") or defaults["title"],
        "labels": {
            **defaults["labels"],
            **(highlight_config.get("labels") or {}),
        },
    }


def enrich_display_media(
    recommendations: list[dict[str, Any]],
    highlights: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, Any]]:
    load_dotenv(BASE_DIR / ".env")
    api_key = os.environ.get("TMDB_API_KEY")
    supplemental = load_json_file(SUPPLEMENTAL_JSON)
    search_cache_path = CACHE_DIR / "tmdb_search_cache.json"
    details_cache_path = CACHE_DIR / "tmdb_details_cache.json"
    search_cache = load_json_file(search_cache_path)
    details_cache = load_json_file(details_cache_path)

    enriched_recommendations = [
        enrich_media_item(recommendation, supplemental, search_cache, details_cache, api_key)
        for recommendation in recommendations
    ]
    enriched_highlights = {}
    for key, value in highlights.items():
        if isinstance(value, dict) and key != "most_repeated_director":
            enriched_highlights[key] = enrich_media_item(value, supplemental, search_cache, details_cache, api_key)
        else:
            enriched_highlights[key] = value

    save_json_file(search_cache_path, search_cache)
    save_json_file(details_cache_path, details_cache)
    all_items = [
        item
        for item in enriched_recommendations
        + [value for value in enriched_highlights.values() if isinstance(value, dict)]
        if isinstance(item, dict)
        and (item.get("title") or item.get("rss_title") or item.get("slug"))
    ]
    status_counts = Counter(str(item.get("poster_status") or "missing") for item in all_items)
    source_counts = Counter(
        str(item.get("poster_source") or "none")
        for item in all_items
        if item.get("poster_status") == "verified"
    )
    ambiguous_items = [
        item.get("title") or item.get("rss_title") or item.get("slug")
        for item in all_items
        if item.get("poster_status") == "ambiguous"
    ]
    missing_items = [
        item.get("title") or item.get("rss_title") or item.get("slug")
        for item in all_items
        if item.get("poster_status") == "missing"
    ]
    obsession = next(
        (
            item
            for item in all_items
            if str(item.get("slug") or "").startswith("obsession-2025")
            or str(item.get("rss_title") or "").startswith("Obsession, 2025")
        ),
        None,
    )
    media_report = {
        "tmdb_lookup_source": "server_cache_or_api" if api_key else "server_cache_only",
        "items_checked": len(all_items),
        "posters_verified": status_counts.get("verified", 0),
        "posters_ambiguous": status_counts.get("ambiguous", 0),
        "posters_missing_count": status_counts.get("missing", 0),
        "verified_by_source": dict(source_counts),
        "homonymy_rejections": ambiguous_items,
        "posters_missing": missing_items,
        "obsession_audit": obsession,
    }
    return enriched_recommendations, enriched_highlights, media_report


def radar_axis_config(axis_id: str, archetypes: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    if axis_id in archetypes and isinstance(archetypes[axis_id], dict):
        return axis_id, archetypes[axis_id]
    for canonical_id, axis in archetypes.items():
        if not isinstance(axis, dict):
            continue
        aliases = axis.get("technical_aliases") or []
        if axis_id in aliases:
            return canonical_id, axis
    return axis_id, {}


def build_radar_editorial(
    metrics: dict[str, Any],
    config: dict[str, Any],
    archetypes: dict[str, Any],
) -> dict[str, Any]:
    radar_config = config.get("radar") or {}
    radar_scores = metrics.get("radar_scores") or {}
    fallback_labels = {
        "mainstreamness": "Popularité",
        "oldness": "Époque",
        "endurance": "Durée",
        "reviewness": "Trace écrite",
    }

    axes: dict[str, Any] = {}
    for axis_id, score in radar_scores.items():
        score_value = int(safe_float((score or {}).get("value_5")) or 0)
        if not 1 <= score_value <= 5:
            raise ValueError(f"Radar score {axis_id} must be an integer from 1 to 5")
        canonical_axis_id, axis_config = radar_axis_config(axis_id, archetypes)
        levels = axis_config.get("levels") or {}
        level = levels.get(str(score_value)) or {}
        axes[axis_id] = {
            "axis_id": canonical_axis_id,
            "technical_axis_id": axis_id,
            "label": axis_config.get("public_axis_label") or fallback_labels.get(axis_id) or title_case_label(axis_id),
            "title": level.get("title") or (score or {}).get("label") or title_case_label(axis_id),
            "one_line": level.get("one_line") or (score or {}).get("description") or "",
            "cran": score_value,
            "image": level.get("image"),
            "image_src": level.get("image_src"),
            "illustration": level.get("illustration"),
        }

    return {
        "title": radar_config.get("title") or "Profil radar",
        "subtitle": radar_config.get("subtitle")
        or "Quatre axes pour situer ton rapport récent aux films : mainstreamness, oldness, staminess et reviewness.",
        "axes": axes,
    }


def build_warnings(metrics: dict[str, Any], config: dict[str, Any]) -> list[str]:
    coverage = metrics["coverage"]
    warnings: list[str] = []
    warning_config = config.get("warnings") or {}
    quality = profile_quality_from_coverage(coverage)
    if quality.get("warning"):
        warnings.append(str(quality["warning"]))
    social_coverage = safe_float(coverage.get("social_coverage")) or 0
    if social_coverage < 0.8:
        warnings.append(
            warning_config.get("low_social_coverage") or "Low social coverage."
        )
    if int(coverage.get("supplemental_review_count") or 0) > 0:
        warnings.append(
            warning_config.get("manual_metadata_validation")
            or "Manual metadata validation pending."
        )
    return warnings


def build_display_profile(username: str) -> tuple[Path, Path]:
    wrapped_path = OUTPUT_DIR / f"{username}_wrapped.json"
    metrics_path = OUTPUT_DIR / f"{username}_profile_metrics.json"
    if not wrapped_path.exists():
        raise FileNotFoundError(f"Missing wrapped JSON: {wrapped_path}")
    if not metrics_path.exists():
        raise FileNotFoundError(f"Missing profile metrics JSON: {metrics_path}")

    wrapped = json.loads(wrapped_path.read_text(encoding="utf-8"))
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    config, fallback_warnings = load_display_config()
    radar_archetypes, radar_archetype_warnings = load_radar_archetypes()
    coverage = metrics["coverage"]
    profile_quality = profile_quality_from_coverage(coverage)
    recommendations_payload = load_recommendations_payload(username)
    recommendations = recommendations_payload.get("recommendations")
    if not isinstance(recommendations, list):
        recommendations = []
    highlights = build_highlights(metrics)
    recommendations, highlights, media_enrichment = enrich_display_media(
        recommendations,
        highlights,
    )

    primary_archetype_id = choose_archetype_id(metrics)
    archetype = archetype_copy(config, primary_archetype_id)
    rating_metrics = metrics.get("rating_personality") or {}
    runtime_metrics = metrics.get("runtime_profile") or {}
    display_profile = {
        "user": username,
        "source_files": {
            "wrapped": str(wrapped_path.relative_to(BASE_DIR)),
            "profile_metrics": str(metrics_path.relative_to(BASE_DIR)),
            "display_config": str(DISPLAY_CONFIG_JSON.relative_to(BASE_DIR)),
            "radar_archetypes": str(RADAR_ARCHETYPES_JSON.relative_to(BASE_DIR)),
        },
        "hero": {
            "username": wrapped.get("user") or username,
            "primary_archetype_id": archetype["id"],
            "primary_archetype": archetype["name"],
            "subtitle": archetype["subtitle"],
            "one_liner": archetype["one_liner"],
            "social_coverage": coverage.get("social_coverage"),
            "metadata_coverage": coverage.get("confirmed_metadata_coverage"),
            "detected_films_count": profile_quality.get("detected_films_count"),
            "target_films_count": profile_quality.get("target_films_count"),
            "profile_quality_status": profile_quality.get("status"),
        },
        "profile_quality": profile_quality,
        "average_rating_summary": {
            "value": safe_float(
                (metrics.get("rating_personality") or {}).get("user_average_rating")
            ),
            "scale": 5,
            "detected_films_count": profile_quality.get("detected_films_count"),
            "target_films_count": profile_quality.get("target_films_count"),
        },
        "radar_scores": metrics.get("radar_scores") or {},
        "radar_editorial": build_radar_editorial(metrics, config, radar_archetypes),
        "log_time_profile": metrics.get("log_time_profile"),
        "genre_bubbles": metrics.get("genre_bubbles") or [],
        "country_map": metrics.get("country_map") or {},
        "recommendations": recommendations,
        "recommendations_status": {
            "available": bool(recommendations),
            "unavailable_reason": recommendations_payload.get("unavailable_reason"),
        },
        "recommendations_copy": build_recommendations_copy(config),
        "cards": build_cards(metrics, config),
        "cards_section": build_cards_section_copy(config),
        "synthesis_cards_audit": {
            "rating_gap_method": rating_metrics.get("method") or "paired_gap",
            "paired_count": rating_metrics.get("paired_count"),
            "runtime_included_count": runtime_metrics.get("runtime_included_count"),
            "runtime_excluded_count": runtime_metrics.get("runtime_excluded_count"),
        },
        "highlights_copy": build_highlights_copy(config),
        "highlights": highlights,
        "media_enrichment": media_enrichment,
        "warnings": build_warnings(metrics, config),
        "config_fallback_warnings": fallback_warnings + radar_archetype_warnings,
    }

    out_json = OUTPUT_DIR / f"{username}_display_profile.json"
    out_md = OUTPUT_DIR / f"{username}_display_profile_report.md"
    out_json.write_text(
        json.dumps(display_profile, ensure_ascii=False, indent=2, allow_nan=False),
        encoding="utf-8",
    )
    out_md.write_text(render_report(display_profile), encoding="utf-8")
    return out_json, out_md


def render_report(profile: dict[str, Any]) -> str:
    hero = profile["hero"]
    lines = [
        f"# Display profile for {hero['username']}",
        "",
        "## Hero",
        "",
        f"- Archetype: {hero['primary_archetype']}",
        f"- Subtitle: {hero['subtitle']}",
        f"- One-liner: {hero['one_liner']}",
        f"- Films detected: {hero.get('detected_films_count')}/{hero.get('target_films_count')}",
        f"- Profile quality: {hero.get('profile_quality_status')}",
        f"- Social coverage: {pct(hero['social_coverage'])}",
        f"- Metadata coverage: {pct(hero['metadata_coverage'])}",
        "",
        "## Radar scores",
        "",
    ]
    for score_id, score in (profile.get("radar_scores") or {}).items():
        lines.append(f"- {score_id}: {score.get('value_5')} / 5")
    lines.extend([
        "",
        "## Genre bubbles",
        "",
    ])
    genre_bubbles = profile.get("genre_bubbles") or []
    if genre_bubbles:
        lines.extend(
            f"- {bubble.get('genre')}: {bubble.get('count')} ({pct(bubble.get('share'))})"
            for bubble in genre_bubbles
        )
    else:
        lines.append("- None")
    lines.extend([
        "",
        "## Country map",
        "",
    ])
    country_map = profile.get("country_map") or {}
    map_countries = country_map.get("countries") or []
    if map_countries:
        lines.extend(
            f"- {country.get('name')} ({country.get('iso2')}): {country.get('count')} ({pct(country.get('share'))})"
            for country in map_countries[:10]
        )
    else:
        lines.append("- None")
    lines.extend([
        "",
        "## Recommendations",
        "",
    ])
    recommendations = profile.get("recommendations") or []
    if recommendations:
        lines.extend(
            f"- {rec.get('slot')}: {rec.get('title')} ({rec.get('score')})"
            for rec in recommendations
        )
    else:
        lines.append("- None")
    lines.extend([
        "",
        "## Cards",
        "",
    ])
    for card in profile["cards"]:
        lines.extend(
            [
                f"### {card['title']}",
                "",
                f"- Value: {card['value']}",
                f"- Label: {card['label']}",
                f"- Description: {card['description']}",
                f"- Confidence: {card['confidence']}",
                f"- Data source: {card['data_source']}",
                "",
            ]
        )

    synthesis_audit = profile.get("synthesis_cards_audit") or {}
    lines.extend(
        [
            "## Synthesis cards audit",
            "",
            f"- rating gap method: {synthesis_audit.get('rating_gap_method') or '-'}",
            f"- paired_count: {synthesis_audit.get('paired_count') if synthesis_audit.get('paired_count') is not None else '-'}",
            f"- runtime included count: {synthesis_audit.get('runtime_included_count') if synthesis_audit.get('runtime_included_count') is not None else '-'}",
            f"- runtime excluded count: {synthesis_audit.get('runtime_excluded_count') if synthesis_audit.get('runtime_excluded_count') is not None else '-'}",
            "",
        ]
    )

    highlights = profile["highlights"]
    lines.extend(["## Highlights", ""])
    for key, value in highlights.items():
        if isinstance(value, dict) and "title" in value:
            display = f"{value.get('title')} ({value.get('slug')})"
        elif isinstance(value, dict) and "director" in value:
            display = f"{value.get('director')} ({value.get('count')} films)"
        else:
            display = str(value)
        lines.append(f"- {key}: {display}")

    media = profile.get("media_enrichment") or {}
    lines.extend(["", "## Poster verification", ""])
    lines.extend(
        [
            f"- Posters verified: {media.get('posters_verified', 0)}",
            f"- Posters ambiguous: {media.get('posters_ambiguous', 0)}",
            f"- Posters missing: {media.get('posters_missing_count', 0)}",
        ]
    )
    homonymy = media.get("homonymy_rejections") or []
    lines.append("- Homonymy rejections: " + (", ".join(str(item) for item in homonymy) if homonymy else "None"))
    obsession = media.get("obsession_audit") or {}
    if obsession:
        match = obsession.get("poster_match") or {}
        lines.extend(
            [
                "- Obsession:",
                f"  - poster_status: {obsession.get('poster_status')}",
                f"  - tmdb_id: {obsession.get('tmdb_id') or match.get('tmdb_id')}",
                f"  - tmdb_title: {match.get('tmdb_title')}",
                f"  - tmdb_year: {match.get('tmdb_year')}",
                f"  - confidence: {match.get('confidence')}",
            ]
        )
    lines.extend(["", "## Highlight metadata audit", ""])
    for key, value in (profile.get("highlights") or {}).items():
        if not isinstance(value, dict) or "title" not in value:
            continue
        lines.append(
            "- "
            + f"{key}: {value.get('title')} | slug: {value.get('slug')} | "
            + f"director: {value.get('director') or '-'} | "
            + f"director_source: {value.get('director_source') or '-'} | "
            + f"poster_status: {value.get('poster_status')} | "
            + f"poster_source: {value.get('poster_source')} | "
            + f"poster_url: {'yes' if value.get('poster_url') else 'no'}"
        )

    lines.extend(["", "## Warnings", ""])
    if profile["warnings"]:
        lines.extend(f"- {warning}" for warning in profile["warnings"])
    else:
        lines.append("- None")
    lines.extend(["", "## Config fallbacks", ""])
    if profile.get("config_fallback_warnings"):
        lines.extend(f"- {warning}" for warning in profile["config_fallback_warnings"])
    else:
        lines.append("- None")
    return "\n".join(lines) + "\n"


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python scripts/build_display_profile.py <letterboxd_username>")
        raise SystemExit(2)

    out_json, out_md = build_display_profile(sys.argv[1])
    print(f"Wrote {out_json}")
    print(f"Wrote {out_md}")


if __name__ == "__main__":
    main()
