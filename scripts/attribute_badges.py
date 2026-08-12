"""Turn a closed Hall of Fame month's podiums and continent winners into
persisted "earned" badges.

Usage:
    python scripts/attribute_badges.py <month YYYY-MM>

    Run this only for a month that has ALREADY ended (e.g. run on the 1st of
    September for "2026-08"), never for the current, still-open month —
    otherwise a badge could appear and then disappear as more people opt in,
    which is more confusing than useful. See the Hall of Fame brief, section 3.3.

Output:
    data/output/hall_of_fame/badges/<username>.json (one file per user,
    accumulating badges across months; idempotent — re-running for the same
    month never duplicates a badge that's already there)
"""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_hof_rankings import build_rankings  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
BADGES_DIR = BASE_DIR / "data" / "output" / "hall_of_fame" / "badges"

CATEGORY_LABELS = {
    "mainstream": "Mainstream",
    "niche": "Niche",
    "critique": "Critique",
    "fantome": "Fantôme",
    "nostalgique": "Nostalgique",
    "sorties_annee": "Sorties de l'année",
}

MONTH_NAMES_FR = {
    1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril", 5: "Mai", 6: "Juin",
    7: "Juillet", 8: "Août", 9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre",
}


def month_label(month: str) -> str:
    year, month_index = month.split("-")
    return f"{MONTH_NAMES_FR[int(month_index)]} {year}"


def load_badges(username: str) -> list[dict[str, Any]]:
    path = BADGES_DIR / f"{username}.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def save_badges(username: str, badges: list[dict[str, Any]]) -> None:
    BADGES_DIR.mkdir(parents=True, exist_ok=True)
    path = BADGES_DIR / f"{username}.json"
    path.write_text(json.dumps(badges, indent=2, ensure_ascii=False), encoding="utf-8")


def already_has(badges: list[dict[str, Any]], month: str, category: str) -> bool:
    return any(badge["month"] == month and badge["category"] == category for badge in badges)


def attribute_badges_for_month(month: str) -> dict[str, int]:
    rankings = build_rankings(month)
    label = month_label(month)
    now = datetime.now(UTC).isoformat()
    new_badges_by_user: dict[str, list[dict[str, Any]]] = {}

    for podium in rankings["podiums"]:
        category_label = CATEGORY_LABELS[podium["key"]]
        for entry in podium["entries"]:
            new_badges_by_user.setdefault(entry["username"], []).append(
                {
                    "type": "earned",
                    "label": f"Top {entry['rank']} {category_label} — {label}",
                    "category": podium["key"],
                    "rank": entry["rank"],
                    "month": month,
                    "created_at": now,
                }
            )

    for continent, winner in rankings["continent_winners"].items():
        new_badges_by_user.setdefault(winner["username"], []).append(
            {
                "type": "earned",
                "label": f"Top {continent} — {label}",
                "category": f"continent:{continent}",
                "rank": 1,
                "month": month,
                "created_at": now,
            }
        )

    attributed_count = 0
    for username, new_badges in new_badges_by_user.items():
        existing = load_badges(username)
        added = False
        for badge in new_badges:
            if already_has(existing, month, badge["category"]):
                continue
            existing.append(badge)
            attributed_count += 1
            added = True
        if added:
            save_badges(username, existing)

    return {"users_awarded": len(new_badges_by_user), "badges_written": attributed_count}


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/attribute_badges.py <month YYYY-MM>")

    month = sys.argv[1]
    current_month = datetime.now(UTC).strftime("%Y-%m")
    if month >= current_month:
        raise SystemExit(
            f"Refusing to attribute badges for {month}: that month isn't closed yet "
            f"(current month is {current_month}). Badges are only awarded for finished seasons."
        )

    result = attribute_badges_for_month(month)
    print(f"Attributed badges for {month}: {result['badges_written']} badge(s) across {result['users_awarded']} user(s).")


if __name__ == "__main__":
    main()
