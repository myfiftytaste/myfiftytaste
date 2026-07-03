"""Validate the UI-facing display profile JSON.

Usage:
    python scripts/validate_display_profile.py <letterboxd_username>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "data" / "output"

REQUIRED_HERO_FIELDS = [
    "username",
    "primary_archetype",
    "one_liner",
]

REQUIRED_CARD_FIELDS = [
    "id",
    "title",
    "value",
    "label",
    "description",
    "confidence",
    "data_source",
]

EXPECTED_CARD_IDS = [
    "rating_personality",
    "reviewness",
    "runtime_profile",
    "country_passport",
]

REQUIRED_RADAR_IDS = [
    "mainstreamness",
    "oldness",
    "endurance",
    "reviewness",
]

REQUIRED_GENRE_BUBBLE_FIELDS = [
    "genre",
    "count",
    "share",
    "size",
]

REQUIRED_COUNTRY_MAP_FIELDS = [
    "name",
    "iso2",
    "count",
    "share",
    "intensity",
    "films",
]

REQUIRED_RECOMMENDATION_FIELDS = [
    "slot",
    "title",
    "slug",
    "score",
    "reason_text",
]

REQUIRED_LOG_TIME_PROFILE_FIELDS = [
    "average_time",
    "period",
    "label",
]

OPTIONAL_MEDIA_FIELDS = [
    "tmdb_id",
    "poster_path",
    "poster_url",
    "backdrop_path",
    "backdrop_url",
    "poster_status",
    "poster_source",
    "poster_match",
]

FILM_HIGHLIGHT_KEYS = [
    "most_niche",
    "most_mainstream",
    "most_cult",
    "longest",
    "shortest",
]


def validate_optional_media_fields(item: dict[str, Any], prefix: str, errors: list[str]) -> None:
    status = item.get("poster_status")
    if status is not None and status not in {"verified", "ambiguous", "missing"}:
        errors.append(f"Invalid {prefix}.poster_status")
    for field in OPTIONAL_MEDIA_FIELDS:
        if field not in item or item[field] is None:
            continue
        if field == "tmdb_id":
            if not isinstance(item[field], (int, str)):
                errors.append(f"Invalid {prefix}.{field}")
        elif field == "poster_match":
            if not isinstance(item[field], dict):
                errors.append(f"Invalid {prefix}.{field}")
        elif field != "poster_status" and not isinstance(item[field], str):
            errors.append(f"Invalid {prefix}.{field}")

def has_path(data: dict[str, Any], path: list[str]) -> bool:
    current: Any = data
    for part in path:
        if not isinstance(current, dict) or part not in current:
            return False
        current = current[part]
    return True


def validate(username: str) -> list[str]:
    profile_path = OUTPUT_DIR / f"{username}_display_profile.json"
    errors: list[str] = []

    if not profile_path.exists():
        return [f"Missing display profile: {profile_path}"]

    try:
        profile = json.loads(profile_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"Could not parse display profile JSON: {exc}"]

    for field in REQUIRED_HERO_FIELDS:
        if not has_path(profile, ["hero", field]):
            errors.append(f"Missing hero.{field}")

    for field in ["eyebrow", "title"]:
        if not has_path(profile, ["cards_section", field]):
            errors.append(f"Missing cards_section.{field}")

    cards = profile.get("cards")
    if not isinstance(cards, list) or not cards:
        errors.append("Missing or empty cards")
    else:
        card_ids = [card.get("id") for card in cards if isinstance(card, dict)]
        if card_ids != EXPECTED_CARD_IDS:
            errors.append(
                "Invalid visible card order: "
                + ", ".join(str(card_id) for card_id in card_ids)
            )
        for index, card in enumerate(cards):
            if not isinstance(card, dict):
                errors.append(f"cards[{index}] is not an object")
                continue
            for field in REQUIRED_CARD_FIELDS:
                if field not in card:
                    errors.append(f"Missing cards[{index}].{field}")

    radar_scores = profile.get("radar_scores")
    if not isinstance(radar_scores, dict):
        errors.append("Missing or invalid radar_scores")
    else:
        for score_id in REQUIRED_RADAR_IDS:
            score = radar_scores.get(score_id)
            if not isinstance(score, dict):
                errors.append(f"Missing radar_scores.{score_id}")
                continue
            if "value_5" not in score:
                errors.append(f"Missing radar_scores.{score_id}.value_5")
            elif not isinstance(score["value_5"], int) or not 1 <= score["value_5"] <= 5:
                errors.append(f"Invalid radar_scores.{score_id}.value_5")
        if "cultness" in radar_scores:
            errors.append("radar_scores.cultness should be replaced by reviewness")

    radar_editorial_axes = ((profile.get("radar_editorial") or {}).get("axes") or {})
    if isinstance(radar_scores, dict) and isinstance(radar_editorial_axes, dict):
        for score_id in REQUIRED_RADAR_IDS:
            score = radar_scores.get(score_id)
            editorial = radar_editorial_axes.get(score_id)
            if isinstance(score, dict) and isinstance(editorial, dict):
                if editorial.get("cran") != score.get("value_5"):
                    errors.append(f"Radar cran mismatch for {score_id}")
                if "raw_cran" in editorial:
                    errors.append(f"Deprecated raw_cran present for {score_id}")

    genre_bubbles = profile.get("genre_bubbles")
    if genre_bubbles is not None:
        if not isinstance(genre_bubbles, list):
            errors.append("genre_bubbles must be a list when present")
        else:
            for index, bubble in enumerate(genre_bubbles):
                if not isinstance(bubble, dict):
                    errors.append(f"genre_bubbles[{index}] is not an object")
                    continue
                for field in REQUIRED_GENRE_BUBBLE_FIELDS:
                    if field not in bubble:
                        errors.append(f"Missing genre_bubbles[{index}].{field}")
                films = bubble.get("films")
                if films is not None:
                    if not isinstance(films, list):
                        errors.append(f"genre_bubbles[{index}].films must be a list")
                    else:
                        for film_index, film in enumerate(films):
                            if not isinstance(film, dict):
                                errors.append(
                                    f"genre_bubbles[{index}].films[{film_index}] is not an object"
                                )
                                continue
                            for field in ["title", "year", "slug"]:
                                if field not in film:
                                    errors.append(
                                        f"Missing genre_bubbles[{index}].films[{film_index}].{field}"
                                    )

    country_map = profile.get("country_map")
    if country_map is not None:
        if not isinstance(country_map, dict):
            errors.append("country_map must be an object when present")
        else:
            countries = country_map.get("countries")
            if countries is not None:
                if not isinstance(countries, list):
                    errors.append("country_map.countries must be a list when present")
                else:
                    for index, country in enumerate(countries):
                        if not isinstance(country, dict):
                            errors.append(f"country_map.countries[{index}] is not an object")
                            continue
                        for field in REQUIRED_COUNTRY_MAP_FIELDS:
                            if field not in country:
                                errors.append(f"Missing country_map.countries[{index}].{field}")
                        films = country.get("films")
                        if films is not None:
                            if not isinstance(films, list):
                                errors.append(f"country_map.countries[{index}].films must be a list")
                            else:
                                for film_index, film in enumerate(films):
                                    if not isinstance(film, dict):
                                        errors.append(
                                            f"country_map.countries[{index}].films[{film_index}] is not an object"
                                        )
                                        continue
                                    for field in ["title", "year", "slug"]:
                                        if field not in film:
                                            errors.append(
                                                f"Missing country_map.countries[{index}].films[{film_index}].{field}"
                                            )

    recommendations = profile.get("recommendations")
    if recommendations is not None:
        if not isinstance(recommendations, list):
            errors.append("recommendations must be a list when present")
        else:
            for index, recommendation in enumerate(recommendations):
                if not isinstance(recommendation, dict):
                    errors.append(f"recommendations[{index}] is not an object")
                    continue
                for field in REQUIRED_RECOMMENDATION_FIELDS:
                    if field not in recommendation:
                        errors.append(f"Missing recommendations[{index}].{field}")
                validate_optional_media_fields(recommendation, f"recommendations[{index}]", errors)

    log_time_profile = profile.get("log_time_profile")
    if log_time_profile is not None:
        if not isinstance(log_time_profile, dict):
            errors.append("log_time_profile must be an object when present")
        else:
            for field in REQUIRED_LOG_TIME_PROFILE_FIELDS:
                if field not in log_time_profile:
                    errors.append(f"Missing log_time_profile.{field}")

    highlights = profile.get("highlights")
    if not isinstance(highlights, dict):
        errors.append("Missing or invalid highlights")
    else:
        for key, value in highlights.items():
            if isinstance(value, dict):
                validate_optional_media_fields(value, f"highlights.{key}", errors)
        for key in FILM_HIGHLIGHT_KEYS:
            value = highlights.get(key)
            if not isinstance(value, dict):
                errors.append(f"Missing or invalid highlights.{key}")
                continue
            for field in ["title", "slug", "director", "directors", "poster_status", "poster_source"]:
                if field not in value:
                    errors.append(f"Missing highlights.{key}.{field}")
            if value.get("director") is not None and not isinstance(value.get("director"), str):
                errors.append(f"Invalid highlights.{key}.director")
            if not isinstance(value.get("directors"), list):
                errors.append(f"Invalid highlights.{key}.directors")

    warnings = profile.get("warnings")
    if not isinstance(warnings, list):
        errors.append("Missing or invalid warnings")

    return errors


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python scripts/validate_display_profile.py <letterboxd_username>")
        raise SystemExit(2)

    errors = validate(sys.argv[1])
    if errors:
        print("Display profile validation failed:")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print(f"Display profile is valid for {sys.argv[1]}.")


if __name__ == "__main__":
    main()
