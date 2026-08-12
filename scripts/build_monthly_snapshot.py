"""Build a frozen Hall of Fame monthly snapshot for one user.

Usage:
    python scripts/build_monthly_snapshot.py <letterboxd_username> [month]

    month defaults to the current UTC month ("YYYY-MM").

Inputs:
    data/output/<username>_wrapped.json
    data/output/<username>_profile_metrics.json
    data/output/<username>_display_profile.json

Output:
    data/output/hall_of_fame/<month>/<username>_snapshot.json

Idempotent by design: if a snapshot already exists for this username+month,
it is returned unchanged and nothing is recalculated. This is the freeze
that makes a Hall of Fame season fair — whichever values were true the
first time someone showed up this month are the values that count, even if
their real profile keeps changing afterwards.
"""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_profile_metrics import normalize_country_name  # noqa: E402
from hall_of_fame_common import continent_breakdown_for_films  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "data" / "output"
HOF_DIR = OUTPUT_DIR / "hall_of_fame"


def current_month() -> str:
    return datetime.now(UTC).strftime("%Y-%m")


def load_json(path: Path) -> Optional[dict[str, Any]]:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def safe_get(data: dict[str, Any], *keys: str) -> Any:
    current: Any = data
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def build_metrics_snapshot(
    metrics: dict[str, Any], display_profile: dict[str, Any], wrapped: dict[str, Any], month: str
) -> dict[str, Any]:
    detected_films_count = safe_get(metrics, "coverage", "detected_films_count") or 0
    mainstream_pct = safe_get(metrics, "radar_scores", "mainstreamness", "raw_value")
    niche_pct = safe_get(metrics, "niche_profile", "niche_index")
    review_count = safe_get(metrics, "radar_scores", "reviewness", "review_count")
    average_release_year = safe_get(metrics, "radar_scores", "oldness", "average_year")

    films = wrapped.get("films") or []
    current_year = int(month.split("-")[0])
    films_with_year = [film for film in films if isinstance(film.get("year"), (int, float))]
    current_year_release_count = sum(1 for film in films_with_year if int(film["year"]) == current_year)
    current_year_release_pct = (
        round((current_year_release_count / len(films_with_year)) * 100, 1) if films_with_year else None
    )

    return {
        "detected_films_count": detected_films_count,
        "mainstream_pct": round(mainstream_pct, 1) if mainstream_pct is not None else None,
        "niche_pct": round(niche_pct, 1) if niche_pct is not None else None,
        "review_count": review_count,
        "average_release_year": round(average_release_year, 1) if average_release_year is not None else None,
        "current_year_release_pct": current_year_release_pct,
        "current_year_release_count": current_year_release_count,
    }


def build_snapshot(username: str, month: str) -> dict[str, Any]:
    metrics = load_json(OUTPUT_DIR / f"{username}_profile_metrics.json")
    display_profile = load_json(OUTPUT_DIR / f"{username}_display_profile.json")
    wrapped = load_json(OUTPUT_DIR / f"{username}_wrapped.json")

    if metrics is None or display_profile is None or wrapped is None:
        raise SystemExit(
            f"Missing pipeline output for '{username}'. Run the profile pipeline "
            "(build_user_wrapped -> ... -> build_display_profile) before building a snapshot."
        )

    display_username = safe_get(display_profile, "hero", "username") or username
    films = wrapped.get("films") or []
    continent_films = continent_breakdown_for_films(films, normalize_country_name)

    return {
        "month": month,
        "username": display_username,
        "first_seen_at": datetime.now(UTC).isoformat(),
        "opted_in": None,
        "opted_in_at": None,
        "metrics_snapshot": build_metrics_snapshot(metrics, display_profile, wrapped, month),
        "continent_consumption": {continent: len(items) for continent, items in continent_films.items()},
        "continent_films": {continent: items[:8] for continent, items in continent_films.items()},
    }


def main() -> None:
    if len(sys.argv) not in (2, 3):
        raise SystemExit("Usage: python scripts/build_monthly_snapshot.py <username> [month YYYY-MM]")

    username = sys.argv[1]
    month = sys.argv[2] if len(sys.argv) == 3 else current_month()

    month_dir = HOF_DIR / month
    month_dir.mkdir(parents=True, exist_ok=True)
    snapshot_path = month_dir / f"{username}_snapshot.json"

    if snapshot_path.exists():
        print(f"Snapshot already exists for {username} / {month} — returning it unchanged.")
        print(snapshot_path)
        return

    snapshot = build_snapshot(username, month)
    snapshot_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {snapshot_path}")


if __name__ == "__main__":
    main()
