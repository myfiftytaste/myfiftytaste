"""Compute Hall of Fame rankings for one month from frozen snapshots.

Usage:
    python scripts/build_hof_rankings.py [month]

    month defaults to the current UTC month ("YYYY-MM").

Input:
    Postgres monthly_snapshot table (month = <month>).

Output:
    data/output/hall_of_fame/<month>/_rankings.json
    data/output/hall_of_fame/<month>/_rankings_report.md
    (local report files only — the data source itself is live Postgres, not
    local files; useful as a standalone reporting/debug tool.)

This is the offline/CLI counterpart of web/lib/hallOfFame.ts, which the
live /hall-of-fame page uses to recompute rankings on every request (see
that file's header comment for why: rankings depend on live opt-in state,
so a cached artifact would go stale the moment someone opts in or out).
Both implementations follow the same rules and now read the same table;
keep them in sync.
"""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Callable, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))

from hall_of_fame_common import CONTINENTS, connect  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
HOF_DIR = BASE_DIR / "data" / "output" / "hall_of_fame"

PODIUM_DEFS: list[dict[str, Any]] = [
    {
        "key": "mainstream",
        "title": "Top Mainstream",
        "sub": "A consommé le plus de blockbusters et succès populaires",
        "metric": lambda s: s["metrics_snapshot"].get("mainstream_pct"),
        "direction": "desc",
        "format": lambda v: f"{round(v)}% mainstream",
    },
    {
        "key": "niche",
        "title": "Top Niche",
        "sub": "A creusé le plus loin dans les films niche",
        "metric": lambda s: s["metrics_snapshot"].get("niche_pct"),
        "direction": "desc",
        "format": lambda v: f"{round(v)}% niche",
    },
    {
        "key": "critique",
        "title": "Top Critique",
        "sub": "A le plus commenté ses visionnages",
        "metric": lambda s: s["metrics_snapshot"].get("review_count"),
        "direction": "desc",
        "format": lambda v: f"{round(v)} reviews",
    },
    {
        "key": "fantome",
        "title": "Top Fantôme",
        "sub": "N'a laissé aucune trace écrite",
        "metric": lambda s: s["metrics_snapshot"].get("review_count"),
        "direction": "asc",
        "format": lambda v: f"{round(v)} reviews",
    },
    {
        "key": "nostalgique",
        "title": "Top Nostalgique",
        "sub": "Le plus tourné vers le cinéma d'hier",
        "metric": lambda s: s["metrics_snapshot"].get("average_release_year"),
        "direction": "asc",
        "format": lambda v: f"{round(v)} année moy.",
    },
]


def current_month() -> str:
    return datetime.now(UTC).strftime("%Y-%m")


def load_snapshots(month: str) -> list[dict[str, Any]]:
    conn = connect()
    rows = conn.execute(
        """
        SELECT username, display_username, first_seen_at, opted_in,
               metrics_snapshot, continent_consumption, continent_films
        FROM monthly_snapshot
        WHERE month = %s
        """,
        (month,),
    ).fetchall()
    # display_username preserve la casse d'origine Letterboxd (meme fallback
    # que profile_cache / GET /api/profile ailleurs) ; first_seen_at converti
    # en ISO string, le tri ci-dessous compare des chaines (herite du format
    # JSON d'origine, inchange pour ne pas toucher a cette logique deja testee).
    return [
        {
            "username": row["display_username"] or row["username"],
            "first_seen_at": row["first_seen_at"].isoformat(),
            "opted_in": row["opted_in"],
            "metrics_snapshot": row["metrics_snapshot"] or {},
            "continent_consumption": row["continent_consumption"] or {},
            "continent_films": row["continent_films"] or {},
        }
        for row in rows
    ]


def rank_podium(
    snapshots: list[dict[str, Any]],
    metric: Callable[[dict[str, Any]], Optional[float]],
    direction: str,
    fmt: Callable[[float], str],
) -> list[dict[str, Any]]:
    scored = [(snapshot, metric(snapshot)) for snapshot in snapshots]
    scored = [(snapshot, value) for snapshot, value in scored if value is not None]
    scored.sort(key=lambda item: (-item[1] if direction == "desc" else item[1], item[0]["first_seen_at"]))
    entries = []
    for rank, (snapshot, value) in enumerate(scored[:3], start=1):
        entries.append({"rank": rank, "username": snapshot["username"], "metric_label": fmt(value)})
    return entries


def rank_continents(snapshots: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    winners: dict[str, dict[str, Any]] = {}
    for continent in CONTINENTS:
        best_snapshot = None
        best_value = 0
        for snapshot in snapshots:
            value = (snapshot.get("continent_consumption") or {}).get(continent, 0)
            if value > best_value or (
                value == best_value and best_value > 0 and best_snapshot is not None
                and snapshot["first_seen_at"] < best_snapshot["first_seen_at"]
            ):
                best_value = value
                best_snapshot = snapshot
        # A continent with zero consumption across every opted-in profile
        # gets no winner this month — never an invented/default attribution.
        if best_snapshot is not None and best_value > 0:
            films = (best_snapshot.get("continent_films") or {}).get(continent, [])
            winners[continent] = {
                "username": best_snapshot["username"],
                "film_count": best_value,
                "films": films[:4],
            }
    return winners


def build_rankings(month: str) -> dict[str, Any]:
    snapshots = load_snapshots(month)
    opted_in = [snapshot for snapshot in snapshots if snapshot.get("opted_in") is True]

    podiums = []
    for podium_def in PODIUM_DEFS:
        podiums.append(
            {
                "key": podium_def["key"],
                "title": podium_def["title"],
                "sub": podium_def["sub"],
                "entries": rank_podium(opted_in, podium_def["metric"], podium_def["direction"], podium_def["format"]),
            }
        )

    sorties_annee_year = int(month.split("-")[0])
    podiums.append(
        {
            "key": "sorties_annee",
            "title": "Top Sorties de l'année",
            "sub": "Le plus à jour sur les sorties de l'année",
            "entries": rank_podium(
                opted_in,
                lambda s: s["metrics_snapshot"].get("current_year_release_pct"),
                "desc",
                lambda v, year=sorties_annee_year: f"{round(v)}% de films sortis en {year}",
            ),
        }
    )

    return {
        "month": month,
        "generated_at": datetime.now(UTC).isoformat(),
        "participant_count": len(opted_in),
        "podiums": podiums,
        "continent_winners": rank_continents(opted_in),
    }


def render_report(rankings: dict[str, Any]) -> str:
    lines = [
        f"# Hall of Fame rankings — {rankings['month']}",
        "",
        f"- Generated at: {rankings['generated_at']}",
        f"- Opted-in participants: {rankings['participant_count']}",
        "",
    ]
    for podium in rankings["podiums"]:
        lines.append(f"## {podium['title']}")
        lines.append("")
        lines.append(podium["sub"])
        lines.append("")
        if not podium["entries"]:
            lines.append("- No entries.")
        for entry in podium["entries"]:
            lines.append(f"- #{entry['rank']}: {entry['username']} — {entry['metric_label']}")
        lines.append("")

    lines.append("## Continent winners")
    lines.append("")
    if not rankings["continent_winners"]:
        lines.append("- No continent had any clear consumption this month.")
    for continent, winner in rankings["continent_winners"].items():
        lines.append(f"- {continent}: {winner['username']} ({winner['film_count']} films)")
    lines.append("")

    return "\n".join(lines)


def main() -> None:
    month = sys.argv[1] if len(sys.argv) > 1 else current_month()
    rankings = build_rankings(month)

    month_dir = HOF_DIR / month
    month_dir.mkdir(parents=True, exist_ok=True)
    out_json = month_dir / "_rankings.json"
    out_md = month_dir / "_rankings_report.md"

    out_json.write_text(json.dumps(rankings, indent=2, ensure_ascii=False), encoding="utf-8")
    out_md.write_text(render_report(rankings), encoding="utf-8")
    print(f"Wrote {out_json}")
    print(f"Wrote {out_md}")


if __name__ == "__main__":
    main()
