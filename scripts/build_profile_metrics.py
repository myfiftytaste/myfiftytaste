"""Build product-ready MyFiftyTaste profile metrics from a wrapped JSON file.

Usage:
    python scripts/build_profile_metrics.py <letterboxd_username>

Inputs:
    data/output/<username>_wrapped.json

Outputs:
    data/output/<username>_profile_metrics.json
    data/output/<username>_profile_metrics_report.md
"""

from __future__ import annotations

import json
import math
import re
import sys
import unicodedata
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from statistics import mean, median
from typing import Any, Callable, Optional


BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "data" / "output"

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


def letterboxd_person_slug(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name)
    ascii_name = "".join(char for char in normalized if not unicodedata.combining(char))
    ascii_name = ascii_name.replace("'", "").replace("’", "")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_name.lower())
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug

COUNTRY_ISO2_MAP = {
    "USA": "US",
    "UK": "GB",
    "Japan": "JP",
    "France": "FR",
    "South Korea": "KR",
    "Spain": "ES",
    "Italy": "IT",
    "Sweden": "SE",
    "Germany": "DE",
    "Canada": "CA",
    "Ireland": "IE",
    "Nigeria": "NG",
    "Belgium": "BE",
    "Switzerland": "CH",
    "China": "CN",
}


def safe_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or not math.isfinite(number):
        return None
    return number


def json_safe(value: Any) -> Any:
    """Recursively replace non-finite floats with JSON-compatible nulls."""
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, dict):
        return {key: json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [json_safe(item) for item in value]
    return value


def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def pct(value: Optional[float]) -> str:
    if value is None:
        return "n/a"
    return f"{value:.2%}"


def rounded(value: Any, digits: int = 2) -> Any:
    number = safe_float(value)
    if number is None:
        return None
    return round(number, digits)


def normalize_country_name(value: Any) -> Optional[str]:
    if value is None:
        return None
    country = str(value).strip()
    if not country:
        return None
    return COUNTRY_NAME_MAP.get(country, country)


def film_title(film: Optional[dict[str, Any]]) -> Optional[str]:
    if not film:
        return None
    title = film.get("title") or film.get("rss_title") or film.get("letterboxd_slug")
    slug = film.get("letterboxd_slug")
    if slug:
        return f"{title} ({slug})"
    return title


def pick_best(
    films: list[dict[str, Any]], keyfunc: Callable[[dict[str, Any]], Optional[float]]
) -> Optional[dict[str, Any]]:
    candidates = [(film, keyfunc(film)) for film in films]
    candidates = [(film, score) for film, score in candidates if score is not None]
    if not candidates:
        return None
    return max(candidates, key=lambda item: item[1])[0]


def pick_worst(
    films: list[dict[str, Any]], keyfunc: Callable[[dict[str, Any]], Optional[float]]
) -> Optional[dict[str, Any]]:
    candidates = [(film, keyfunc(film)) for film in films]
    candidates = [(film, score) for film, score in candidates if score is not None]
    if not candidates:
        return None
    return min(candidates, key=lambda item: item[1])[0]


def rating_personality_label(diff: Optional[float]) -> Optional[str]:
    if diff is None:
        return None
    if diff > 0.25:
        return "generous"
    if diff < -0.25:
        return "severe"
    return "balanced"


def runtime_label(runtime_average: Optional[float]) -> Optional[str]:
    if runtime_average is None:
        return None
    if runtime_average < 95:
        return "short-form friendly"
    if runtime_average <= 125:
        return "standard runtime"
    return "long-film tolerant"


def country_label(non_us_share: Optional[float]) -> Optional[str]:
    if non_us_share is None:
        return None
    if non_us_share < 0.35:
        return "Hollywood-centered"
    if non_us_share < 0.65:
        return "internationally curious"
    return "world cinema explorer"


def parse_year_from_title(title: Any) -> Optional[int]:
    if not title:
        return None
    match = re.search(r",\s*(\d{4})(?:\s*-|$)", str(title))
    if not match:
        match = re.search(r"\b(18\d{2}|19\d{2}|20\d{2})\b", str(title))
    if not match:
        return None
    try:
        return int(match.group(1))
    except Exception:
        return None


def score_from_thresholds(value: float, thresholds: list[tuple[float, float, int]]) -> int:
    """Return a score from ordered inclusive thresholds, never below the first score."""
    if not thresholds:
        return 1
    for low, high, score in thresholds:
        if low <= value <= high:
            return score
    if value < thresholds[0][0]:
        return thresholds[0][2]
    return thresholds[-1][2]


REVIEWNESS_LABELS = {
    0: "Spectateur silencieux",
    1: "Quelques traces",
    2: "Critique sélectif",
    3: "Carnet régulier",
    4: "Plume assidue",
    5: "Journal intégral",
}

REVIEWNESS_DESCRIPTIONS = {
    0: "Tu notes surtout tes films sans laisser de trace écrite.",
    1: "Tu écris seulement quand un film appelle vraiment un commentaire.",
    2: "Tu choisis tes moments : certaines séances méritent une vraie trace.",
    3: "Ton profil ressemble déjà à un carnet de cinéma régulier.",
    4: "Tu accompagnes souvent tes notes d’un regard écrit.",
    5: "Chaque film ou presque devient une entrée de journal.",
}

LOG_TIME_LABELS = {
    "morning": "Soleil matinal",
    "afternoon": "Séance d’après-midi",
    "evening": "Prime time",
    "night": "Oiseau de nuit",
}

LOG_TIME_DESCRIPTIONS = {
    "morning": "Tes films sont surtout loggés en début de journée.",
    "afternoon": "Tes films sont surtout loggés dans l’après-midi.",
    "evening": "Tes films sont surtout loggés en soirée.",
    "night": "Tes films sont surtout loggés tard dans la journée.",
}


def log_time_period(hour_decimal: float) -> str:
    hour = int(math.floor(hour_decimal)) % 24
    if 5 <= hour < 12:
        return "morning"
    if 12 <= hour < 18:
        return "afternoon"
    if 18 <= hour < 23:
        return "evening"
    return "night"


def circular_average_log_time(films: list[dict[str, Any]]) -> Optional[dict[str, Any]]:
    minutes: list[int] = []
    for film in films:
        hour = safe_float(film.get("logged_hour"))
        minute = safe_float(film.get("logged_minute"))
        if hour is None or minute is None:
            continue
        if not (0 <= hour < 24 and 0 <= minute < 60):
            continue
        minutes.append(int(hour) * 60 + int(minute))
    if not minutes:
        return None

    sin_sum = sum(math.sin((minute / 1440) * math.tau) for minute in minutes)
    cos_sum = sum(math.cos((minute / 1440) * math.tau) for minute in minutes)
    mean_angle = math.atan2(sin_sum / len(minutes), cos_sum / len(minutes))
    if mean_angle < 0:
        mean_angle += math.tau
    average_minutes = int(round((mean_angle / math.tau) * 1440)) % 1440
    average_hour_decimal = average_minutes / 60
    hour = average_minutes // 60
    minute = average_minutes % 60
    period = log_time_period(average_hour_decimal)
    return {
        "average_time": f"{hour:02d}:{minute:02d}",
        "average_hour_decimal": round(average_hour_decimal, 2),
        "period": period,
        "label": LOG_TIME_LABELS[period],
        "description": LOG_TIME_DESCRIPTIONS[period],
        "data_source": f"{len(minutes)} films from Letterboxd RSS",
        "confidence": confidence_for_count(len(minutes), 40),
    }


def niche_score_for_watches(watches: float) -> float:
    """Map watches to a niche score using a simple log scale.

    1,000 watches or fewer => 100, 1,000,000 watches or more => 0.
    Values in between are interpolated on log10(watches), because popularity
    varies by orders of magnitude.
    """
    if watches <= 0:
        return 100.0
    low = math.log10(1_000)
    high = math.log10(1_000_000)
    value = math.log10(watches)
    return clamp((high - value) / (high - low) * 100)


def counter_from_list_fields(
    films: list[dict[str, Any]],
    field: str,
    normalizer: Optional[Callable[[Any], Optional[str]]] = None,
) -> Counter:
    counter: Counter = Counter()
    for film in films:
        values = film.get(field) or []
        if isinstance(values, list):
            if normalizer:
                counter.update([value for value in (normalizer(v) for v in values) if value])
            else:
                counter.update([value for value in values if value])
    return counter


def average_or_none(values: list[float]) -> Optional[float]:
    return mean(values) if values else None


def film_sample_quality(count: int) -> dict[str, Any]:
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


def confidence_for_count(count: int, high: int, medium: int = 10) -> str:
    if count >= high:
        return "high"
    if count >= medium:
        return "medium"
    return "low"


def build_metrics(username: str) -> tuple[Path, Path]:
    wrapped_path = OUTPUT_DIR / f"{username}_wrapped.json"
    if not wrapped_path.exists():
        raise FileNotFoundError(f"Missing wrapped JSON: {wrapped_path}")

    wrapped = json.loads(wrapped_path.read_text(encoding="utf-8"))
    films = wrapped.get("films") or []
    if not isinstance(films, list):
        raise ValueError("Invalid wrapped JSON: `films` must be a list")

    total_films = len(films)
    sample_quality = film_sample_quality(total_films)
    if total_films == 0:
        raise RuntimeError(sample_quality["warning"])
    rss_data_source = f"{total_films} films from Letterboxd RSS"
    social_films = [
        film
        for film in films
        if film.get("has_social_stats") is True and film.get("source") == "megabank"
    ]
    metadata_films = [
        film
        for film in films
        if film.get("has_metadata") is True
        and film.get("source") in {"megabank", "supplemental"}
    ]
    review_films = [film for film in films if film.get("source") == "supplemental_review"]
    rejected_films = [
        film for film in films if film.get("source") == "supplemental_rejected"
    ]
    missing_films = [film for film in films if film.get("source") == "missing"]

    social_count = len(social_films)
    metadata_count = len(metadata_films)
    potential_metadata_count = metadata_count + len(review_films)
    social_coverage = social_count / total_films if total_films else None
    metadata_coverage_confirmed = metadata_count / total_films if total_films else None
    metadata_coverage_potential = (
        potential_metadata_count / total_films if total_films else None
    )

    user_ratings = [
        rating for rating in (safe_float(film.get("user_rating")) for film in films)
        if rating is not None
    ]
    community_ratings = [
        rating
        for rating in (
            safe_float(film.get("average_rating")) for film in social_films
        )
        if rating is not None
    ]
    user_average_rating = mean(user_ratings) if user_ratings else None
    community_average_rating = mean(community_ratings) if community_ratings else None
    average_difference = (
        user_average_rating - community_average_rating
        if user_average_rating is not None and community_average_rating is not None
        else None
    )
    paired_rating_entries = []
    for film in social_films:
        user_rating = safe_float(film.get("user_rating"))
        community_rating = safe_float(film.get("average_rating"))
        if user_rating is None or community_rating is None:
            continue
        paired_rating_entries.append((user_rating, community_rating))
    paired_user_average_rating = (
        mean(user_rating for user_rating, _ in paired_rating_entries)
        if paired_rating_entries
        else None
    )
    paired_community_average_rating = (
        mean(community_rating for _, community_rating in paired_rating_entries)
        if paired_rating_entries
        else None
    )
    paired_average_difference = (
        mean(user_rating - community_rating for user_rating, community_rating in paired_rating_entries)
        if paired_rating_entries
        else None
    )
    paired_rating_count = len(paired_rating_entries)

    watches = [
        value
        for value in (safe_float(film.get("watches")) for film in social_films)
        if value is not None
    ]
    watches_median = median(watches) if watches else None
    watches_mean = mean(watches) if watches else None
    most_niche = pick_worst(social_films, lambda film: safe_float(film.get("watches")))
    most_mainstream = pick_best(social_films, lambda film: safe_float(film.get("watches")))
    niche_scores = [niche_score_for_watches(value) for value in watches]
    niche_index = mean(niche_scores) if niche_scores else None

    cult_entries = []
    for film in social_films:
        fans = safe_float(film.get("fans"))
        film_watches = safe_float(film.get("watches"))
        if fans is None or film_watches is None or film_watches <= 0:
            continue
        ratio = fans / film_watches
        cult_entries.append({"film": film, "ratio": ratio})
    best_cult_entry = max(cult_entries, key=lambda item: item["ratio"]) if cult_entries else None
    average_cult_ratio = mean(item["ratio"] for item in cult_entries) if cult_entries else None
    cult_index = (
        clamp((average_cult_ratio / 0.02) * 100)
        if average_cult_ratio is not None
        else None
    )

    runtimes = [
        value
        for value in (safe_float(film.get("runtime")) for film in metadata_films)
        if value is not None and value > 0
    ]
    runtime_included_count = len(runtimes)
    runtime_excluded_count = total_films - runtime_included_count
    runtime_invalid_metadata_count = len(metadata_films) - runtime_included_count
    runtime_average = mean(runtimes) if runtimes else None
    def positive_runtime(film: dict[str, Any]) -> Optional[float]:
        value = safe_float(film.get("runtime"))
        return value if value is not None and value > 0 else None

    shortest = pick_worst(metadata_films, positive_runtime)
    longest = pick_best(metadata_films, positive_runtime)

    years = [
        year for year in (
            safe_float(film.get("year")) or parse_year_from_title(film.get("rss_title"))
            for film in films
        )
        if year is not None and 1870 <= year <= 2100
    ]
    current_year = datetime.now(UTC).year
    average_year = mean(years) if years else None
    average_age = (current_year - average_year) if average_year is not None else None

    genre_counter = counter_from_list_fields(metadata_films, "genres")
    top_genres = genre_counter.most_common(10)
    genre_diversity_count = len(genre_counter)
    dominant_genre = top_genres[0][0] if top_genres else None
    total_genre_mentions = sum(genre_counter.values())
    dominant_genre_share = (
        top_genres[0][1] / total_genre_mentions if top_genres and total_genre_mentions else None
    )
    genre_rating_stats: dict[str, dict[str, list[float]]] = {}
    genre_film_map: dict[str, list[dict[str, Any]]] = {}
    for film in metadata_films:
        genres = film.get("genres") or []
        if not isinstance(genres, list):
            continue
        film_entry = {
            "title": film.get("title"),
            "year": film.get("year"),
            "slug": film.get("slug"),
        }
        user_rating = safe_float(film.get("user_rating"))
        community_rating = safe_float(film.get("average_rating"))
        for genre in genres:
            if not genre:
                continue
            stats = genre_rating_stats.setdefault(
                str(genre),
                {"user_ratings": [], "community_ratings": []},
            )
            if user_rating is not None:
                stats["user_ratings"].append(user_rating)
            if community_rating is not None:
                stats["community_ratings"].append(community_rating)
            genre_film_map.setdefault(str(genre), []).append(film_entry)

    top_bubble_genres = genre_counter.most_common(12)
    max_genre_count = top_bubble_genres[0][1] if top_bubble_genres else 0
    genre_bubbles = []
    for genre, count in top_bubble_genres:
        stats = genre_rating_stats.get(str(genre), {})
        average_user_rating = average_or_none(stats.get("user_ratings", []))
        average_community_rating = average_or_none(stats.get("community_ratings", []))
        rating_gap = (
            average_user_rating - average_community_rating
            if average_user_rating is not None and average_community_rating is not None
            else None
        )
        normalized = count / max_genre_count if max_genre_count else 0
        genre_bubbles.append({
            "genre": genre,
            "count": count,
            "share": count / total_genre_mentions if total_genre_mentions else None,
            "size": round(40 + normalized * 100, 2),
            "average_user_rating": rounded(average_user_rating, 2),
            "average_community_rating": rounded(average_community_rating, 2),
            "rating_gap": rounded(rating_gap, 2),
            "films": genre_film_map.get(str(genre), []),
        })

    country_counter = counter_from_list_fields(
        metadata_films, "countries", normalize_country_name
    )
    top_countries = country_counter.most_common(10)
    number_of_countries = len(country_counter)
    dominant_country = top_countries[0][0] if top_countries else None
    total_country_mentions = sum(country_counter.values())
    us_mentions = country_counter.get("USA", 0)
    non_us_share = (
        (total_country_mentions - us_mentions) / total_country_mentions
        if total_country_mentions
        else None
    )
    country_map_entries = []
    max_country_count = country_counter.most_common(1)[0][1] if country_counter else 0
    for country, count in country_counter.most_common():
        country_films = []
        for film in metadata_films:
            film_countries = film.get("countries") or []
            if not isinstance(film_countries, list):
                continue
            normalized_countries = [
                normalize_country_name(item) for item in film_countries
            ]
            if country not in normalized_countries:
                continue
            country_films.append({
                "title": film.get("title") or film.get("rss_title"),
                "year": film.get("year"),
                "slug": film.get("letterboxd_slug"),
            })
        country_map_entries.append({
            "name": country,
            "iso2": COUNTRY_ISO2_MAP.get(country),
            "count": count,
            "share": count / total_country_mentions if total_country_mentions else None,
            "intensity": count / max_country_count if max_country_count else 0,
            "films": country_films,
        })
    country_map = {
        "title": "Ma carte",
        "subtitle": f"Les pays de production qui traversent tes {total_films} films détectés.",
        "countries": country_map_entries,
        "max_count": max_country_count,
        "total_country_tags": total_country_mentions,
    }

    director_counter = counter_from_list_fields(metadata_films, "directors")
    top_directors = director_counter.most_common(10)
    repeat_directors = [
        {"director": director, "count": count}
        for director, count in director_counter.most_common()
        if count > 1
    ]
    most_repeated_director = repeat_directors[0] if repeat_directors else None
    if most_repeated_director:
        repeated_name = most_repeated_director["director"]
        director_slug = letterboxd_person_slug(repeated_name)
        repeated_films = []
        for film in metadata_films:
            directors = film.get("directors") or []
            if isinstance(directors, list) and repeated_name in directors:
                repeated_films.append(
                    {
                        "title": film.get("title") or film.get("rss_title"),
                        "slug": film.get("letterboxd_slug"),
                        "year": film.get("year"),
                    }
                )
        most_repeated_director = {
            **most_repeated_director,
            "director_slug": director_slug,
            "letterboxd_url": f"https://letterboxd.com/director/{director_slug}/" if director_slug else None,
            "films": repeated_films,
        }

    review_count = sum(1 for film in films if film.get("has_review") is True)
    review_rate = review_count / total_films if total_films else 0
    log_time_profile = circular_average_log_time(films)
    reviewness_value = score_from_thresholds(
        review_count,
        [(0, 8, 1), (9, 17, 2), (18, 29, 3), (30, 42, 4), (43, 50, 5)],
    )
    mainstream_raw = (100 - niche_index) if niche_index is not None else None
    mainstream_normalized = clamp(mainstream_raw or 0, 0, 100)
    # Thresholds recalibrated 2026-08-09: the original 25/50/70/90 split assumed
    # mainstream_normalized would spread across the full 0-100 range, but real
    # users' 50 recent logs skew far higher than a random Megabank sample (people
    # still mostly watch films with real cultural visibility, even niche-leaning
    # viewers). All 7 real profiles landed in bucket 4-5 under the old thresholds.
    # Rescaled to the range actually observed (roughly 65-95) so the axis
    # discriminates again.
    mainstream_value = (
        1 if mainstream_normalized <= 45 else
        2 if mainstream_normalized <= 65 else
        3 if mainstream_normalized <= 80 else
        4 if mainstream_normalized <= 92 else 5
    )
    oldness_value = (
        1 if average_year is None or average_year < 1975 else
        2 if average_year <= 1989 else
        3 if average_year <= 2004 else
        4 if average_year <= 2016 else 5
    )
    endurance_value = score_from_thresholds(
        int(round(runtime_average or 0)),
        [(0, 95, 1), (96, 105, 2), (106, 120, 3), (121, 135, 4), (136, 999, 5)],
    )
    radar_scores = {
        "mainstreamness": {
            "value_5": mainstream_value,
            "raw_value": mainstream_raw,
            "label": "Popularité moyenne",
            "description": "Tendance dérivée de l'audience moyenne de tes films socialement matchés.",
            "data_source": f"{social_count} films with Megabank social stats",
            "confidence": confidence_for_count(social_count, 25),
        },
        "oldness": {
            "value_5": oldness_value,
            "raw_value": average_age,
            "average_year": average_year,
            "label": "Âge moyen",
            "description": f"Tendance dérivée de l'année moyenne de sortie de tes {total_films} films détectés.",
            "data_source": rss_data_source,
            "confidence": confidence_for_count(len(years), 40),
        },
        "endurance": {
            "value_5": endurance_value,
            "raw_value": runtime_average,
            "label": "Endurance",
            "description": "Tendance dérivée de la durée moyenne de tes films avec métadonnées confirmées.",
            "data_source": f"{metadata_count} films with confirmed metadata",
            "confidence": confidence_for_count(metadata_count, 40),
        },
        "reviewness": {
            "value_5": reviewness_value,
            "raw_value": review_count,
            "review_count": review_count,
            "review_rate": review_rate,
            "label": REVIEWNESS_LABELS[reviewness_value],
            "description": REVIEWNESS_DESCRIPTIONS[reviewness_value],
            "data_source": rss_data_source,
            "confidence": confidence_for_count(total_films, 50),
        },
    }

    metrics = {
        "user": username,
        "source_file": str(wrapped_path.relative_to(BASE_DIR)),
        "coverage": {
            "total_films_analyzed": total_films,
            "detected_films_count": total_films,
            "target_films_count": 50,
            "profile_quality": sample_quality,
            "social_films_count": social_count,
            "confirmed_metadata_films_count": metadata_count,
            "potential_metadata_films_count": potential_metadata_count,
            "supplemental_review_count": len(review_films),
            "supplemental_rejected_count": len(rejected_films),
            "missing_count": len(missing_films),
            "social_coverage": social_coverage,
            "confirmed_metadata_coverage": metadata_coverage_confirmed,
            "potential_metadata_coverage": metadata_coverage_potential,
            "review_count": review_count,
            "review_rate": review_rate,
        },
        "radar_scores": radar_scores,
        "log_time_profile": log_time_profile,
        "rating_personality": {
            "user_average_rating": user_average_rating,
            "community_average_rating": community_average_rating,
            "average_difference": average_difference,
            "paired_user_average_rating": paired_user_average_rating,
            "paired_community_average_rating": paired_community_average_rating,
            "paired_average_difference": paired_average_difference,
            "paired_count": paired_rating_count,
            "method": "paired_gap",
            "label": rating_personality_label(paired_average_difference),
        },
        "niche_profile": {
            "watches_median": watches_median,
            "watches_mean": watches_mean,
            "most_niche_film": most_niche,
            "most_mainstream_film": most_mainstream,
            "niche_index": niche_index,
            "formula": "Average per-film score on social films: clamp((log10(1,000,000) - log10(watches)) / (log10(1,000,000) - log10(1,000)) * 100, 0, 100). Lower watches means a higher niche score.",
        },
        "cult_profile": {
            "best_cult_film": best_cult_entry["film"] if best_cult_entry else None,
            "best_cult_ratio": best_cult_entry["ratio"] if best_cult_entry else None,
            "average_cult_ratio": average_cult_ratio,
            "cult_index": cult_index,
            "formula": "fans / watches per social film; cult_index = clamp(average_cult_ratio / 0.02 * 100, 0, 100). A 2% average fans/watches ratio maps to 100.",
        },
        "runtime_profile": {
            "runtime_average": runtime_average,
            "runtime_included_count": runtime_included_count,
            "runtime_excluded_count": runtime_excluded_count,
            "runtime_invalid_metadata_count": runtime_invalid_metadata_count,
            "shortest_film": shortest,
            "longest_film": longest,
            "label": runtime_label(runtime_average),
        },
        "genre_dna": {
            "top_genres": top_genres,
            "genre_diversity_count": genre_diversity_count,
            "dominant_genre": dominant_genre,
            "dominant_genre_share": dominant_genre_share,
        },
        "genre_bubbles": genre_bubbles,
        "country_passport": {
            "top_countries": top_countries,
            "number_of_countries": number_of_countries,
            "dominant_country": dominant_country,
            "non_us_share": non_us_share,
            "label": country_label(non_us_share),
        },
        "country_map": country_map,
        "director_recurrence": {
            "top_directors": top_directors,
            "repeat_directors": repeat_directors,
            "most_repeated_director": most_repeated_director,
        },
    }

    metrics = json_safe(metrics)
    out_json = OUTPUT_DIR / f"{username}_profile_metrics.json"
    out_md = OUTPUT_DIR / f"{username}_profile_metrics_report.md"
    out_json.write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2, allow_nan=False, default=str),
        encoding="utf-8",
    )
    out_md.write_text(render_report(username, metrics), encoding="utf-8")
    return out_json, out_md


def render_list(items: list[tuple[Any, int]]) -> str:
    if not items:
        return "- None\n"
    return "".join(f"- {name}: {count}\n" for name, count in items)


def render_report(username: str, metrics: dict[str, Any]) -> str:
    coverage = metrics["coverage"]
    radar = metrics["radar_scores"]
    rating = metrics["rating_personality"]
    niche = metrics["niche_profile"]
    cult = metrics["cult_profile"]
    runtime = metrics["runtime_profile"]
    log_time = metrics.get("log_time_profile") or {}
    genre = metrics["genre_dna"]
    country = metrics["country_passport"]
    directors = metrics["director_recurrence"]

    lines = [
        f"# Profile metrics for {username}",
        "",
        "## Coverage",
        "",
        f"- Total films analyzed: {coverage['total_films_analyzed']}",
        f"- Social coverage: {pct(coverage['social_coverage'])}",
        f"- Confirmed metadata coverage: {pct(coverage['confirmed_metadata_coverage'])}",
        f"- Potential metadata coverage: {pct(coverage['potential_metadata_coverage'])}",
        f"- Review count: {coverage['review_count']}",
        f"- Review rate: {pct(coverage['review_rate'])}",
        f"- Social films used: {coverage['social_films_count']}",
        f"- Metadata films used: {coverage['confirmed_metadata_films_count']}",
        f"- Supplemental review excluded from stats: {coverage['supplemental_review_count']}",
        f"- Supplemental rejected excluded from stats: {coverage['supplemental_rejected_count']}",
        f"- Missing excluded from stats: {coverage['missing_count']}",
        "",
        "## Rating personality",
        "",
        f"- User average rating: {rounded(rating['user_average_rating'], 3)}",
        f"- Community average rating: {rounded(rating['community_average_rating'], 3)}",
        f"- Average difference: {rounded(rating['average_difference'], 3)}",
        f"- Method: {rating.get('method') or '-'}",
        f"- Paired count: {rating.get('paired_count')}",
        f"- Paired user average rating: {rounded(rating.get('paired_user_average_rating'), 3)}",
        f"- Paired community average rating: {rounded(rating.get('paired_community_average_rating'), 3)}",
        f"- Paired average difference: {rounded(rating.get('paired_average_difference'), 3)}",
        f"- Label: {rating['label']}",
        "",
        "## Niche profile",
        "",
        f"- Watches median: {rounded(niche['watches_median'], 0)}",
        f"- Watches mean: {rounded(niche['watches_mean'], 0)}",
        f"- Most niche film: {film_title(niche['most_niche_film'])}",
        f"- Most mainstream film: {film_title(niche['most_mainstream_film'])}",
        f"- Niche index: {rounded(niche['niche_index'], 1)} / 100",
        f"- Formula: {niche['formula']}",
        "",
        "## Radar scores",
        "",
        f"- Mainstreamness: {radar['mainstreamness']['value_5']} / 5",
        f"- Oldness: {radar['oldness']['value_5']} / 5",
        f"- Endurance: {radar['endurance']['value_5']} / 5",
        f"- Reviewness: {radar['reviewness']['value_5']} / 5",
        f"- Reviewness label: {radar['reviewness']['label']}",
        "",
        "## Cult profile",
        "",
        f"- Best cult film: {film_title(cult['best_cult_film'])}",
        f"- Best cult ratio: {pct(cult['best_cult_ratio'])}",
        f"- Average cult ratio: {pct(cult['average_cult_ratio'])}",
        f"- Cult index: {rounded(cult['cult_index'], 1)} / 100",
        f"- Formula: {cult['formula']}",
        "",
        "## Runtime profile",
        "",
        f"- Runtime average: {rounded(runtime['runtime_average'], 1)} min",
        f"- Runtime included count: {runtime.get('runtime_included_count')}",
        f"- Runtime excluded count: {runtime.get('runtime_excluded_count')}",
        f"- Shortest film: {film_title(runtime['shortest_film'])}",
        f"- Longest film: {film_title(runtime['longest_film'])}",
        f"- Label: {runtime['label']}",
        "",
        "## Log time profile",
        "",
        f"- Average log time: {log_time.get('average_time') or '-'}",
        f"- Period: {log_time.get('period') or '-'}",
        f"- Label: {log_time.get('label') or '-'}",
        f"- Confidence: {log_time.get('confidence') or '-'}",
        "",
        "## Genre DNA",
        "",
        "### Top genres",
        "",
        render_list(genre["top_genres"]).rstrip(),
        "",
        f"- Genre diversity count: {genre['genre_diversity_count']}",
        f"- Dominant genre: {genre['dominant_genre']}",
        f"- Dominant genre share: {pct(genre['dominant_genre_share'])}",
        "",
        "## Country passport",
        "",
        "### Top countries",
        "",
        render_list(country["top_countries"]).rstrip(),
        "",
        f"- Number of countries: {country['number_of_countries']}",
        f"- Dominant country: {country['dominant_country']}",
        f"- Non-US share: {pct(country['non_us_share'])}",
        f"- Label: {country['label']}",
        "",
        "## Director recurrence",
        "",
        "### Top directors",
        "",
        render_list(directors["top_directors"]).rstrip(),
        "",
        "### Repeat directors",
        "",
    ]

    repeat_directors = directors["repeat_directors"]
    if repeat_directors:
        lines.extend(
            f"- {item['director']}: {item['count']}" for item in repeat_directors
        )
    else:
        lines.append("- None")
    most_repeated = directors["most_repeated_director"]
    lines.extend(
        [
            "",
            f"- Most repeated director: {most_repeated['director'] if most_repeated else None}",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python scripts/build_profile_metrics.py <letterboxd_username>")
        raise SystemExit(2)

    out_json, out_md = build_metrics(sys.argv[1])
    print(f"Wrote {out_json}")
    print(f"Wrote {out_md}")


if __name__ == "__main__":
    main()
