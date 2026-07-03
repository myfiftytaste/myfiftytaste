"""Build deterministic film recommendations from Megabank and profile metrics.

Usage:
    python scripts/build_recommendations.py <letterboxd_username>

Inputs:
    data/output/<username>_wrapped.json
    data/output/<username>_profile_metrics.json
    data/processed/megabank_clean.json

Outputs:
    data/output/<username>_recommendations.json
    data/output/<username>_recommendations_report.md
"""

from __future__ import annotations

import json
import math
import re
import sys
from collections import Counter
from pathlib import Path
from statistics import mean, median
from typing import Any, Optional


BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "data" / "output"
MEGABANK_JSON = BASE_DIR / "data" / "processed" / "megabank_clean.json"

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
    watches = safe_float(record.get("watches"))
    fans = safe_float(record.get("fans"))
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
    mainstream_value = clamp((math.log10(watches or 1) - 3) / 3) if watches else 0.45
    mainstream_score = clamp(1 - abs(mainstream_value - (mainstream_target / 5)))
    rating_score = normalized_rating(average_rating)
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
        "niche_score": niche_score(watches, context["watches_median"]),
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
    if slot == "deep_cut":
        codes.append("deep_cut")
    if slot == "wild_card":
        codes.append("wild_card_contrast")
    return codes


def reason_text(slot: str, record: dict[str, Any], context: dict[str, Any]) -> str:
    if slot == "safe_pick":
        return "Un choix proche de ton profil récent, avec des genres et une réception qui collent bien à tes habitudes."
    if slot == "deep_cut":
        return "Un détour moins évident, retenu parce qu’il garde des points communs avec ton profil sans répéter les choix les plus visibles."
    return "Un pari plus oblique : il change d’angle tout en gardant un point d’accroche avec tes goûts récents."


def recommendation_payload(slot: str, record: dict[str, Any], score_value: float, score: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    directors = list_values(record.get("directors"))
    return {
        "slot": slot,
        "title": record.get("title"),
        "year": score.get("year"),
        "slug": record.get("letterboxd_slug"),
        "letterboxd_url": record.get("letterboxd_url"),
        "score": rounded(score_value, 4),
        "reason_codes": reason_codes_for(record, score, context, slot),
        "reason_text": reason_text(slot, record, context),
        "genres": list_values(record.get("genres")),
        "countries": [normalize_country_name(value) for value in list_values(record.get("countries")) if normalize_country_name(value)],
        "runtime": rounded(record.get("runtime"), 0),
        "average_rating": rounded(record.get("average_rating"), 2),
        "watches": rounded(record.get("watches"), 0),
        "fans": rounded(record.get("fans"), 0),
        "director": directors[0] if directors else None,
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


def has_non_us_country(record: dict[str, Any]) -> bool:
    countries = countries_set(record)
    return any(country != "USA" for country in countries)


def popularity_bucket(record: dict[str, Any], context: dict[str, Any]) -> str:
    watches = safe_float(record.get("watches"))
    median_watches = context.get("watches_median")
    if watches is None or watches <= 0 or not median_watches:
        return "unknown"
    if watches >= median_watches * 2.0:
        return "high"
    if watches <= median_watches * 0.45:
        return "low"
    return "mid"


def primary_genre(record: dict[str, Any]) -> Optional[str]:
    genres = list_values(record.get("genres"))
    return str(genres[0]) if genres else None


def wild_card_contrast_score(item: dict[str, Any], chosen_items: list[dict[str, Any]], context: dict[str, Any]) -> int:
    if not chosen_items:
        return 0
    record = item["record"]
    score = item["score"]
    reference = chosen_items[0]
    reference_record = reference["record"]
    reference_score = reference["score"]
    contrast = 0

    if countries_set(record) and countries_set(record) != countries_set(reference_record):
        contrast += 1
    if score.get("year") is not None and reference_score.get("year") is not None:
        if abs(score["year"] - reference_score["year"]) >= 12:
            contrast += 1
    if primary_genre(record) and primary_genre(record) != primary_genre(reference_record):
        contrast += 1
    if popularity_bucket(record, context) != popularity_bucket(reference_record, context):
        contrast += 1
    if primary_director(record) and primary_director(record) != primary_director(reference_record):
        contrast += 1
    runtime = safe_float(record.get("runtime"))
    reference_runtime = safe_float(reference_record.get("runtime"))
    if runtime is not None and reference_runtime is not None and abs(runtime - reference_runtime) >= 25:
        contrast += 1
    return contrast


def wild_card_has_contrast(item: dict[str, Any], chosen_items: list[dict[str, Any]], context: dict[str, Any]) -> bool:
    return wild_card_contrast_score(item, chosen_items, context) >= 2


def diversity_reject_reason(
    item: dict[str, Any],
    chosen_items: list[dict[str, Any]],
    slot: str,
    used_directors: set[str],
    context: dict[str, Any],
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
    if slot == "wild_card" and chosen_items and not wild_card_has_contrast(item, chosen_items, context):
        return "wild_card_lacks_contrast"
    return None


def select_diverse_recommendations(scored: list[dict[str, Any]], context: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    chosen_items: list[dict[str, Any]] = []
    used_directors: set[str] = set()
    rejected: list[dict[str, Any]] = []
    non_us_recommendation_sought = (context.get("non_us_share") or 0) >= 0.55

    for item in scored:
        item["context_secondary_genres"] = context.get("secondary_genres", [])

    for slot in ["safe_pick", "deep_cut", "wild_card"]:
        chosen_slugs = {chosen["record"].get("letterboxd_slug") for chosen in chosen_items}

        def slot_rank(item: dict[str, Any]) -> tuple[float, float, str]:
            contrast = wild_card_contrast_score(item, chosen_items, context) if slot == "wild_card" else 0
            item["wild_card_contrast_score"] = contrast
            return (
                item[slot] + (contrast * 0.075 if slot == "wild_card" else 0),
                item["score"]["compatibility"],
                item["record"].get("title") or "",
            )

        ranked = sorted(
            (item for item in scored if item["record"].get("letterboxd_slug") not in chosen_slugs),
            key=slot_rank,
            reverse=True,
        )
        selected = None
        eligible_items = []
        for item in ranked:
            reason = diversity_reject_reason(item, chosen_items, slot, used_directors, context)
            if reason:
                rejected.append({
                    "slot": slot,
                    "title": item["record"].get("title"),
                    "director": primary_director(item["record"]),
                    "countries": sorted(countries_set(item["record"])),
                    "score": rounded(item.get(slot), 4),
                    "reason": reason,
                })
                continue
            eligible_items.append(item)
        if eligible_items:
            selected = eligible_items[0]
            has_non_us_selected = any(has_non_us_country(chosen["record"]) for chosen in chosen_items)
            should_seek_non_us = non_us_recommendation_sought and not has_non_us_selected and slot in {"deep_cut", "wild_card"}
            if should_seek_non_us:
                threshold = selected[slot] * 0.8
                non_us_options = [item for item in eligible_items if has_non_us_country(item["record"]) and item[slot] >= threshold]
                if non_us_options:
                    selected = max(non_us_options, key=slot_rank)
                    rejected.append({
                        "slot": slot,
                        "title": eligible_items[0]["record"].get("title"),
                        "director": primary_director(eligible_items[0]["record"]),
                        "countries": sorted(countries_set(eligible_items[0]["record"])),
                        "score": rounded(eligible_items[0].get(slot), 4),
                        "reason": "replaced_by_non_us_diversity",
                    })
        if selected is None:
            selected = ranked[0]
            rejected.append({
                "slot": slot,
                "title": selected["record"].get("title"),
                "director": primary_director(selected["record"]),
                "countries": sorted(countries_set(selected["record"])),
                "score": rounded(selected.get(slot), 4),
                "reason": "fallback_without_full_diversity",
            })
        selected["selected_slot"] = slot
        chosen_items.append(selected)
        director = primary_director(selected["record"])
        if director:
            used_directors.add(director)

    recommendations = [
        recommendation_payload(item["selected_slot"], item["record"], item[item["selected_slot"]], item["score"], context)
        for item in chosen_items
    ]
    diversity = {
        "directors": [rec.get("director") for rec in recommendations],
        "distinct_directors": len([rec.get("director") for rec in recommendations if rec.get("director")]) == len({rec.get("director") for rec in recommendations if rec.get("director")}),
        "primary_genres": [list_values(item["record"].get("genres"))[:2] for item in chosen_items],
        "countries": [recommendation.get("countries") for recommendation in recommendations],
        "popularity": [popularity_bucket(item["record"], context) for item in chosen_items],
        "non_us_recommendation_sought": non_us_recommendation_sought,
        "non_us_recommendation_found": any(any(country != "USA" for country in rec.get("countries", [])) for rec in recommendations),
        "wild_card_contrast_score": next((item.get("wild_card_contrast_score", 0) for item in chosen_items if item.get("selected_slot") == "wild_card"), 0),
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
    if not MEGABANK_JSON.exists():
        raise FileNotFoundError(f"Missing Megabank JSON: {MEGABANK_JSON}")

    wrapped = json.loads(wrapped_path.read_text(encoding="utf-8"))
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    megabank = json.loads(MEGABANK_JSON.read_text(encoding="utf-8"))
    films = wrapped.get("films") or []
    seen_slugs = {film.get("letterboxd_slug") for film in films if film.get("letterboxd_slug")}
    context = build_profile_context(wrapped, metrics)

    scored = []
    eligibility_excluded = []
    for record in megabank:
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
        watches = safe_float(record.get("watches"))
        rating = safe_float(record.get("average_rating"))
        safe_score = score["compatibility"] + normalized_rating(rating) * 0.18 - score["niche_score"] * 0.08
        deep_score = score["compatibility"] * 0.72 + score["niche_score"] * 0.22 + score["cult_bonus"] * 0.18
        if watches is not None and context["watches_median"]:
            if watches > context["watches_median"] * 4.0:
                deep_score -= 0.28
            elif watches > context["watches_median"] * 1.8:
                deep_score -= 0.18
            elif watches > context["watches_median"]:
                deep_score -= 0.06
        wild_score = (
            score["compatibility"] * 0.42
            + (1 - min(score["genre_score"], 1)) * 0.14
            + score["country_score"] * 0.16
            + score["year_score"] * 0.08
            + normalized_rating(rating) * 0.12
            + score["cult_bonus"] * 0.08
        )
        scored.append({
            "record": record,
            "score": score,
            "safe_pick": safe_score,
            "deep_cut": deep_score,
            "wild_card": wild_score,
        })

    if len(scored) < 3:
        output = {
            "user": username,
            "source_files": {
                "wrapped": str(wrapped_path.relative_to(BASE_DIR)),
                "profile_metrics": str(metrics_path.relative_to(BASE_DIR)),
                "megabank": str(MEGABANK_JSON.relative_to(BASE_DIR)),
            },
            "recommendations": [],
            "unavailable_reason": (
                f"Not enough eligible Megabank candidates after excluding watched films "
                f"({len(scored)} candidate{'s' if len(scored) != 1 else ''} available)."
            ),
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
            "megabank": str(MEGABANK_JSON.relative_to(BASE_DIR)),
        },
        "recommendations": chosen,
        "diversity_checks": diversity_checks,
        "eligibility_excluded": eligibility_excluded[:100],
        "notable_eligibility_excluded": notable_eligibility_excluded,
        "scoring_notes": [
            f"Candidates are Megabank films not present in the user's last {len(films)} RSS films.",
            "Compatibility combines genre, country, language, runtime, era, mainstream fit, community rating, fans/watches, repeat director, and title redundancy.",
            "safe_pick boosts global compatibility and community rating.",
            "deep_cut boosts niche score and fans/watches, with a penalty for very high watch counts.",
            "wild_card uses partial compatibility plus secondary/oblique signals instead of selecting the third-best global score.",
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
        if rec.get("slot") == "safe_pick":
            role = "highest-confidence fit for the current profile."
        elif rec.get("slot") == "deep_cut":
            role = "compatible pick with a less obvious popularity profile."
        else:
            role = f"contrast pick with wild_card_contrast_score={diversity.get('wild_card_contrast_score', 0)}."
        lines.extend([
            f"- {rec.get('slot')}: {rec.get('title')} — {role}",
            f"  Countries: {', '.join(countries) or 'Unknown'} ({non_us_label}).",
            f"  Primary genres: {', '.join((rec.get('genres') or [])[:2]) or 'Unknown'}.",
            f"  Popularity: {popularity} (watches={rec.get('watches')}).",
            f"  Difference: director={rec.get('director')}, runtime={rec.get('runtime')}, year={rec.get('year')}.",
        ])
    lines.extend([
        "",
        "## Diversity checks",
        "",
        f"- Distinct directors: {'yes' if diversity.get('distinct_directors') else 'no'}",
        f"- Non-USA recommendation sought: {'yes' if diversity.get('non_us_recommendation_sought') else 'no'}",
        f"- Non-USA recommendation found: {'yes' if diversity.get('non_us_recommendation_found') else 'no'}",
        f"- Wild card contrast score: {diversity.get('wild_card_contrast_score', 0)}",
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
