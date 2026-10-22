"""Turn a closed Hall of Fame month's podiums and continent winners into
persisted "earned" badges.

Usage:
    python scripts/attribute_badges.py [month YYYY-MM]

    Sans argument : le mois qui vient de se terminer (lancé le 1er du mois par
    .github/workflows/monthly-badges.yml).

    Run this only for a month that has ALREADY ended (e.g. run on the 1st of
    September for "2026-08"), never for the current, still-open month —
    otherwise a badge could appear and then disappear as more people opt in,
    which is more confusing than useful. See the Hall of Fame brief, section 3.3.
    This script is only ever invoked manually/by a scheduled one-off run at
    month close — never from worker.py's continuous loop.

Output:
    Postgres `badge` table (one row per badge, type='earned'). Idempotent:
    the partial unique index badge_earned_unique_idx (username, month,
    category) WHERE type='earned' — migrations/001_initial_schema.sql — makes
    re-running for the same month a no-op rather than a duplicate.
"""

from __future__ import annotations

import re
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_hof_rankings import build_rankings  # noqa: E402
from hall_of_fame_common import connect  # noqa: E402

CATEGORY_LABELS = {
    "mainstream": "Mainstream",
    "niche": "Niche",
    "critique": "Critique",
    "fantome": "Fantôme",
    "nostalgique": "Nostalgique",
    "sorties_annee": "Sorties de l'année",
}

# Règles validées le 22/10/2026 (backlog V3, lot 6) : pas de badges pour un mois
# à moins de 3 inscrits ; un badge de continent demande au moins 3 films de ce
# continent. Un même pseudo peut cumuler plusieurs badges le même mois.
MIN_PARTICIPANTS = 3
MIN_CONTINENT_FILMS = 3

MONTH_NAMES_FR = {
    1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril", 5: "Mai", 6: "Juin",
    7: "Juillet", 8: "Août", 9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre",
}


def month_label(month: str) -> str:
    year, month_index = month.split("-")
    return f"{MONTH_NAMES_FR[int(month_index)]} {year}"


def attribute_badges_for_month(month: str) -> dict[str, int]:
    rankings = build_rankings(month)
    if rankings["participant_count"] < MIN_PARTICIPANTS:
        return {"users_awarded": 0, "badges_written": 0, "participants": rankings["participant_count"]}
    label = month_label(month)

    # (username normalisé, label, category, rank) — username vient des
    # rankings (Bloc B : display_username, casse Letterboxd d'origine) donc
    # normalisé ici au moment d'écrire en base, comme partout ailleurs.
    new_badges: list[tuple[str, str, str, int]] = []

    for podium in rankings["podiums"]:
        category_label = CATEGORY_LABELS[podium["key"]]
        for entry in podium["entries"]:
            new_badges.append(
                (
                    entry["username"].lower(),
                    f"Top {entry['rank']} {category_label} — {label}",
                    podium["key"],
                    entry["rank"],
                )
            )

    for continent, winner in rankings["continent_winners"].items():
        if winner["film_count"] < MIN_CONTINENT_FILMS:
            continue
        new_badges.append((winner["username"].lower(), f"Top {continent} — {label}", f"continent:{continent}", 1))

    conn = connect()
    attributed_count = 0
    awarded_users: set[str] = set()
    for username, badge_label, category, rank in new_badges:
        # ON CONFLICT cible directement badge_earned_unique_idx : re-lancer
        # ce script pour un mois déjà traité ne duplique jamais un badge.
        row = conn.execute(
            """
            INSERT INTO badge (username, type, label, category, rank, month)
            VALUES (%s, 'earned', %s, %s, %s, %s)
            ON CONFLICT (username, month, category) WHERE type = 'earned' DO NOTHING
            RETURNING id
            """,
            (username, badge_label, category, rank, month),
        ).fetchone()
        if row is not None:
            attributed_count += 1
            awarded_users.add(username)

    return {"users_awarded": len(awarded_users), "badges_written": attributed_count, "participants": rankings["participant_count"]}


def main() -> None:
    if len(sys.argv) > 2:
        raise SystemExit("Usage: python scripts/attribute_badges.py [month YYYY-MM]")

    now = datetime.now(UTC)
    current_month = now.strftime("%Y-%m")
    previous_month = f"{now.year - 1}-12" if now.month == 1 else f"{now.year}-{now.month - 1:02d}"
    month = sys.argv[1] if len(sys.argv) == 2 else previous_month
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month):
        raise SystemExit(f"Mois invalide : {month!r} (format attendu AAAA-MM).")
    if month >= current_month:
        raise SystemExit(
            f"Refusing to attribute badges for {month}: that month isn't closed yet "
            f"(current month is {current_month}). Badges are only awarded for finished seasons."
        )

    result = attribute_badges_for_month(month)
    if result["participants"] < MIN_PARTICIPANTS:
        print(f"{month} : {result['participants']} inscrit(s) au Hall of Fame, moins de {MIN_PARTICIPANTS} : aucun badge.")
        return
    print(f"Attributed badges for {month}: {result['badges_written']} badge(s) across {result['users_awarded']} user(s).")


if __name__ == "__main__":
    main()
