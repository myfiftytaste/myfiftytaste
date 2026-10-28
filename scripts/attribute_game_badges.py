"""Badges Fiftyguess du mois (décisions du 28/10/2026). Lancé le 1er du mois par monthly-badges.yml.

    python scripts/attribute_game_badges.py [AAAA-MM]   # défaut : le mois précédent

- « Fiftyguess — octobre 2026 » : meilleur temps moyen en mode compétitif, parmi celles et ceux qui
  ont joué toutes les affiches de la semaine du mois en compétitif (abandon et temps écoulé = 2:00).
  Au moins 3 joueurs qualifiés, comme pour le Hall of Fame. Égalité : badge pour chacun.
- « Série Fiftyguess — octobre 2026 » : 4 affiches de la semaine d'affilée (compétitif ou zen), série
  terminée dans le mois.
Relançable : l'index unique (pseudo, mois, catégorie) empêche les doublons.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from datetime import UTC, datetime  # noqa: E402

from attribute_badges import month_label  # noqa: E402
from hall_of_fame_common import connect  # noqa: E402

MIN_PLAYERS = 3
STREAK = 4


def award(conn, username: str, label: str, category: str, month: str) -> None:
    conn.execute(
        """INSERT INTO badge (username, type, label, category, rank, month) VALUES (%s, 'earned', %s, %s, 1, %s)
           ON CONFLICT (username, month, category) WHERE type = 'earned' DO NOTHING""",
        (username, label, category, month),
    )


def attribute(month: str) -> None:
    conn = connect()
    label = month_label(month)
    weeks = [row["id"] for row in conn.execute(
        "SELECT id FROM game_round WHERE kind = 'week' AND month = %s ORDER BY opens_on", (month,)).fetchall()]
    if weeks:
        rows = conn.execute(
            """SELECT username, avg(score) AS average FROM game_play
               WHERE round_id = ANY(%s) AND mode = 'compet' AND outcome IS NOT NULL
               GROUP BY username HAVING count(*) = %s ORDER BY average""",
            (weeks, len(weeks)),
        ).fetchall()
        if len(rows) >= MIN_PLAYERS:
            for row in rows:
                if row["average"] == rows[0]["average"]:
                    award(conn, row["username"], f"Fiftyguess — {label}", "fiftyguess", month)

    # Séries : toutes les affiches de la semaine jusqu'à la fin du mois, dans l'ordre.
    order = [row["id"] for row in conn.execute(
        "SELECT id, month FROM game_round WHERE kind = 'week' AND month <= %s ORDER BY opens_on", (month,)).fetchall()]
    in_month = set(weeks)
    played: dict[str, set[int]] = {}
    for row in conn.execute("SELECT username, round_id FROM game_play WHERE outcome IS NOT NULL").fetchall():
        played.setdefault(row["username"], set()).add(row["round_id"])
    for username, rounds in played.items():
        run = 0
        for round_id in order:
            run = run + 1 if round_id in rounds else 0
            if run >= STREAK and round_id in in_month:
                award(conn, username, f"Série Fiftyguess — {label}", "fiftyguess_serie", month)
                break
    conn.close()


if __name__ == "__main__":
    now = datetime.now(UTC)
    previous = f"{now.year - 1}-12" if now.month == 1 else f"{now.year}-{now.month - 1:02d}"
    attribute(sys.argv[1] if len(sys.argv) > 1 else previous)
