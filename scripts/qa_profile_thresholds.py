"""QA fixtures for profile size thresholds and optional recommendations.

This script writes synthetic profiles under data/output/qa_* and verifies:
- 50 films: normal profile, no sample-size warning.
- 10 to 49 films: profile is generated with a visible warning.
- 1 to 9 films: profile is generated without crashing and marked very limited.
- 0 films: clean impossible-profile error.
- fewer than 3 recommendation candidates: recommendations are unavailable, not broken.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import build_recommendations as recommendations_module
from build_display_profile import build_display_profile
from build_profile_metrics import build_metrics
from validate_display_profile import EXPECTED_CARD_IDS, validate


BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "data" / "output"
AUDIT_DIR = BASE_DIR / "data" / "audit"
FIXTURE_DIR = BASE_DIR / "data" / "fixtures"


def film(index: int) -> dict[str, Any]:
    genres = [
        ["Drama", "Thriller"],
        ["Comedy", "Drama"],
        ["Horror", "Mystery"],
        ["Crime", "Drama"],
    ][index % 4]
    countries = [["USA"], ["France"], ["Japan"], ["South Korea"]][index % 4]
    return {
        "rss_title": f"QA Film {index}, {2000 + index % 20} - ★★★½",
        "title": f"QA Film {index}",
        "letterboxd_url": f"https://letterboxd.com/film/qa-film-{index}/",
        "letterboxd_slug": f"qa-film-{index}",
        "watched_at": "2026-01-01",
        "user_rating": 3.5,
        "year": 2000 + index % 20,
        "has_review": index % 3 == 0,
        "review_word_count": 18 if index % 3 == 0 else 0,
        "matched": True,
        "source": "megabank",
        "has_social_stats": True,
        "has_metadata": True,
        "directors": [f"Director {index % 7}"],
        "genres": genres,
        "countries": countries,
        "original_language": "English",
        "runtime": 90 + index % 45,
        "average_rating": 3.6 + (index % 8) / 10,
        "watches": 10000 + index * 2500,
        "likes": 1000 + index * 100,
        "fans": 100 + index * 10,
        "total_ratings": 5000 + index * 200,
    }


def write_wrapped(username: str, count: int) -> Path:
    films = [film(index) for index in range(count)]
    wrapped = {
        "user": username,
        "rss_url": f"https://letterboxd.com/{username}/rss/",
        "generated_at": "2026-01-01T00:00:00Z",
        "films": films,
        "profile_summary": {"films_analyzed": count},
        "profile_quality": {
            "detected_films_count": count,
            "target_films_count": 50,
            "status": "normal" if count >= 50 else "partial" if count >= 10 else "very_limited",
            "is_partial": 0 < count < 50,
            "warning": None,
        },
        "highlights": {},
    }
    path = OUTPUT_DIR / f"{username}_wrapped.json"
    path.write_text(json.dumps(wrapped, ensure_ascii=False, indent=2), encoding="utf-8")
    recommendations_path = OUTPUT_DIR / f"{username}_recommendations.json"
    if recommendations_path.exists():
        recommendations_path.unlink()
    return path


def read_display(username: str) -> dict[str, Any]:
    path = OUTPUT_DIR / f"{username}_display_profile.json"
    return json.loads(path.read_text(encoding="utf-8"))


def assert_display_case(username: str, count: int) -> str:
    write_wrapped(username, count)
    build_metrics(username)
    build_display_profile(username)
    errors = validate(username)
    if errors:
        raise AssertionError(f"{username} validation errors: {errors}")
    profile = read_display(username)
    quality = profile.get("profile_quality") or {}
    cards = [card.get("id") for card in profile.get("cards", [])]
    warning_text = "\n".join(profile.get("warnings") or [])

    if cards != EXPECTED_CARD_IDS:
        raise AssertionError(f"{username} visible cards mismatch: {cards}")
    if "niche_profile" in cards:
        raise AssertionError(f"{username} still exposes niche_profile as a card")
    if count == 50 and quality.get("warning"):
        raise AssertionError("50-film profile should not have a sample-size warning")
    if 10 <= count < 50 and (str(count) not in warning_text or quality.get("status") != "partial"):
        raise AssertionError(f"{username} missing partial-profile warning with count {count}")
    if 1 <= count < 10 and (str(count) not in warning_text or quality.get("status") != "very_limited"):
        raise AssertionError(f"{username} missing very-limited warning with count {count}")

    return (
        f"PASS {username}: count={count}, status={quality.get('status')}, "
        f"warning={'yes' if quality.get('warning') else 'no'}, cards={len(cards)}"
    )


def assert_zero_case() -> str:
    username = "qa_0_films"
    write_wrapped(username, 0)
    try:
        build_metrics(username)
    except RuntimeError as exc:
        if "Aucun film détecté" not in str(exc):
            raise AssertionError(f"Unexpected zero-film error: {exc}") from exc
        return f"PASS {username}: clean error={exc}"
    raise AssertionError("0-film profile should raise a clean impossible-profile error")


def assert_recommendations_unavailable() -> str:
    username = "qa_sparse_recommendations"
    write_wrapped(username, 12)
    build_metrics(username)
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    small_megabank = FIXTURE_DIR / "qa_small_megabank.json"
    candidate_a = film(100)
    candidate_b = film(101)
    candidate_a["letterboxd_slug"] = "qa-candidate-a"
    candidate_b["letterboxd_slug"] = "qa-candidate-b"
    small_megabank.write_text(
        json.dumps([candidate_a, candidate_b], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    original_megabank = recommendations_module.MEGABANK_JSON
    recommendations_module.MEGABANK_JSON = small_megabank
    try:
        recommendations_module.build_recommendations(username)
    finally:
        recommendations_module.MEGABANK_JSON = original_megabank

    data = json.loads((OUTPUT_DIR / f"{username}_recommendations.json").read_text(encoding="utf-8"))
    if data.get("recommendations") != []:
        raise AssertionError("Sparse recommendations should output an empty list")
    if not data.get("unavailable_reason"):
        raise AssertionError("Sparse recommendations should explain why they are unavailable")

    build_display_profile(username)
    errors = validate(username)
    if errors:
        raise AssertionError(f"{username} validation errors after sparse recs: {errors}")
    profile = read_display(username)
    if profile.get("recommendations") != []:
        raise AssertionError("Display profile should keep recommendations as an empty list")
    status = profile.get("recommendations_status") or {}
    if not status.get("unavailable_reason"):
        raise AssertionError("Display profile should expose the unavailable recommendations reason")
    return f"PASS {username}: recommendations unavailable cleanly"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)

    results = [
        assert_display_case("qa_50_films", 50),
        assert_display_case("qa_25_films", 25),
        assert_display_case("qa_5_films", 5),
        assert_zero_case(),
        assert_recommendations_unavailable(),
    ]

    report = "# Profile Threshold QA\n\n" + "\n".join(f"- {line}" for line in results) + "\n"
    report_path = AUDIT_DIR / "profile_threshold_qa_report.md"
    report_path.write_text(report, encoding="utf-8")
    print(report)
    print(f"Wrote {report_path}")


if __name__ == "__main__":
    main()
