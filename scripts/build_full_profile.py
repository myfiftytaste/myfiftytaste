"""Build and validate a complete MyFiftyTaste profile.

Usage:
    python scripts/build_full_profile.py <letterboxd_username> [--smoke-test]
"""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "data" / "output"
AUDIT_DIR = BASE_DIR / "data" / "audit"

# Regle officielle Letterboxd (api-docs.letterboxd.com, propriete `username`
# de l'objet Member) : "Usernames must be between 2 and 15 characters long
# and may only contain upper or lowercase letters, numbers or the
# underscore (_) character." Ni tiret ni point - verifie aussi en direct sur
# le formulaire d'inscription ("Use a-z, 0-9 or _ only") et par des essais
# RSS reels sur des pseudos a point plausibles (tous 404). Les pseudos a
# point de la maquette Hall of Fame etaient decoratifs, pas de vrais comptes.
USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{2,15}$")

PIPELINE_STEPS = [
    ("Construction initiale du wrapped", "build_user_wrapped.py", []),
    ("Construction de la file de metadata", "build_missing_metadata_queue.py", []),
    ("Enrichissement TMDB", "enrich_missing_with_tmdb.py", ["--force"]),
    ("Propagation TMDB dans le wrapped", "build_user_wrapped.py", []),
    ("Calcul des métriques", "build_profile_metrics.py", []),
    ("Génération des recommandations", "build_recommendations.py", []),
    ("Construction du display profile", "build_display_profile.py", []),
    ("Validation du display profile", "validate_display_profile.py", []),
]

STRICT_JSON_SUFFIXES = (
    "wrapped",
    "profile_metrics",
    "recommendations",
    "display_profile",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Génère et valide tous les outputs MyFiftyTaste d'un profil public."
    )
    parser.add_argument("username", help="Username Letterboxd public, sans @")
    parser.add_argument(
        "--smoke-test",
        action="store_true",
        help="Génère data/audit/<username>_v1_smoke_test.md",
    )
    args = parser.parse_args()
    if not USERNAME_RE.fullmatch(args.username):
        parser.error("Le username doit contenir entre 2 et 15 lettres, chiffres ou _, rien d'autre.")
    return args


def run_step(index: int, username: str, label: str, script: str, extra: list[str]) -> None:
    command = [sys.executable, str(BASE_DIR / "scripts" / script), username, *extra]
    print(f"\n[{index}/{len(PIPELINE_STEPS)}] {label}", flush=True)
    result = subprocess.run(command, cwd=BASE_DIR, check=False)
    if result.returncode != 0:
        raise RuntimeError(
            f"Étape {index}/{len(PIPELINE_STEPS)} échouée : {label} "
            f"({script}, code {result.returncode})."
        )


def reject_non_finite(value: str) -> None:
    raise ValueError(f"Nombre non fini interdit en JSON strict : {value}")


def load_strict_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Output attendu absent : {path}")
    payload = json.loads(
        path.read_text(encoding="utf-8"),
        parse_constant=reject_non_finite,
    )
    if not isinstance(payload, dict):
        raise TypeError(f"Objet JSON attendu dans {path}")
    return payload


def verify_strict_outputs(username: str) -> dict[str, dict[str, Any]]:
    return {
        suffix: load_strict_json(OUTPUT_DIR / f"{username}_{suffix}.json")
        for suffix in STRICT_JSON_SUFFIXES
    }


def usable_number(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(float(value))
    )


def percentage(value: Any) -> str:
    return f"{float(value):.0%}" if usable_number(value) else "n/a"


def module_status(display: dict[str, Any]) -> list[tuple[str, bool]]:
    country_map = display.get("country_map") or {}
    recommendation_status = display.get("recommendations_status") or {}
    return [
        ("Hero", isinstance(display.get("hero"), dict)),
        ("Radar", bool(display.get("radar_scores"))),
        ("Heure de log", isinstance(display.get("log_time_profile"), dict)),
        ("Constellation des genres", bool(display.get("genre_bubbles"))),
        ("Passeport cinéma", bool(country_map.get("countries"))),
        (
            "Recommandations",
            bool(display.get("recommendations"))
            or recommendation_status.get("available") is False,
        ),
        ("Highlights", bool(display.get("highlights"))),
        ("Synthèse", bool(display.get("cards"))),
    ]


def build_smoke_report(username: str, payloads: dict[str, dict[str, Any]]) -> Path:
    wrapped = payloads["wrapped"]
    metrics = payloads["profile_metrics"]
    recommendations = payloads["recommendations"]
    display = payloads["display_profile"]
    films = wrapped.get("films") or []
    coverage = metrics.get("coverage") or {}

    rated_count = sum(usable_number(film.get("user_rating")) for film in films)
    review_count = sum(bool(film.get("has_review")) for film in films)
    rss_poster_count = sum(bool(film.get("rss_poster_url")) for film in films)
    raw_countries = {
        str(country)
        for film in films
        if film.get("has_metadata")
        for country in (film.get("countries") or [])
        if country
    }
    raw_genres = {
        str(genre)
        for film in films
        if film.get("has_metadata")
        for genre in (film.get("genres") or [])
        if genre
    }
    radar = metrics.get("radar_scores") or {}
    country_count = (metrics.get("country_passport") or {}).get(
        "number_of_countries", len(raw_countries)
    )
    genre_count = (metrics.get("genre_dna") or {}).get(
        "genre_diversity_count", len(raw_genres)
    )
    modules = module_status(display)
    missing_modules = [name for name, present in modules if not present]
    recs = recommendations.get("recommendations") or []
    display_warnings = [str(item) for item in (display.get("warnings") or [])]
    config_warnings = [
        str(item) for item in (display.get("config_fallback_warnings") or [])
    ]
    review_slugs = [
        str(film.get("letterboxd_slug"))
        for film in films
        if film.get("source") == "supplemental_review"
    ]
    missing_posters = [
        str(title)
        for title in ((display.get("media_enrichment") or {}).get("posters_missing") or [])
    ]

    total = len(films)
    detected = coverage.get("detected_films_count", total)
    target = coverage.get("target_films_count", 50)
    metadata_count = coverage.get("confirmed_metadata_films_count", 0)
    social_count = coverage.get("social_films_count", 0)
    metadata_coverage = coverage.get("confirmed_metadata_coverage")
    social_coverage = coverage.get("social_coverage")

    lines = [
        f"# Smoke test V1 — {username}",
        "",
        f"Date : {datetime.now().astimezone().date().isoformat()}  ",
        f"Profil : `https://letterboxd.com/{username}/`  ",
        "Résultat final : **succès — display profile valide et JSON strict**",
        "",
        "## Couverture",
        "",
        "| Vérification | Résultat |",
        "| --- | ---: |",
        f"| Films détectés | {detected}/{target} |",
        f"| Films notés | {rated_count}/{total} |",
        f"| Reviews détectées | {review_count}/{total} |",
        f"| Metadata confirmée | {metadata_count}/{total} — {percentage(metadata_coverage)} |",
        f"| Social coverage Megabank | {social_count}/{total} — {percentage(social_coverage)} |",
        f"| Posters RSS Letterboxd trouvés | {rss_poster_count}/{total} |",
        f"| Pays de production distincts | {country_count} |",
        f"| Genres distincts | {genre_count} |",
        "",
        "## Radar",
        "",
        "| Axe | Score |",
        "| --- | ---: |",
    ]
    for axis in ("mainstreamness", "oldness", "endurance", "reviewness"):
        score = (radar.get(axis) or {}).get("value_5")
        label = "`endurance` / `staminess`" if axis == "endurance" else f"`{axis}`"
        lines.append(f"| {label} | {score}/5 |")

    lines.extend(["", "## Recommandations", ""])
    if recs:
        for recommendation in recs:
            lines.append(
                f"- `{recommendation.get('slot')}` — "
                f"*{recommendation.get('title') or 'Titre non renseigné'}*"
            )
    else:
        reason = recommendations.get("unavailable_reason") or "raison non renseignée"
        lines.append(f"- Aucune recommandation : {reason}")

    lines.extend(["", "## Modules", ""])
    for name, present in modules:
        lines.append(f"- {name} : {'présent' if present else 'manquant'}")
    lines.append("")
    lines.append(
        "Modules manquants : " + (", ".join(missing_modules) if missing_modules else "aucun") + "."
    )

    lines.extend(["", "## Warnings non bloquants", ""])
    warnings: list[str] = []
    warnings.extend(display_warnings)
    warnings.extend(config_warnings)
    if review_slugs:
        warnings.append(
            f"{len(review_slugs)} correspondance(s) metadata en revue manuelle : "
            + ", ".join(f"`{slug}`" for slug in review_slugs)
            + "."
        )
    if missing_posters:
        warnings.append(
            f"{len(missing_posters)} affiche(s) non vérifiée(s) dans l'enrichissement display : "
            + ", ".join(f"*{title}*" for title in missing_posters)
            + "."
        )
    if warnings:
        lines.extend(f"- {warning}" for warning in warnings)
    else:
        lines.append("- Aucun warning non bloquant.")

    lines.extend(
        [
            "",
            "## Validation",
            "",
            "- Validation du display profile : réussie.",
            "- JSON strict : `wrapped`, `profile_metrics`, `recommendations` et `display_profile` valides.",
            "",
        ]
    )

    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = AUDIT_DIR / f"{username}_v1_smoke_test.md"
    report_path.write_text("\n".join(lines), encoding="utf-8")
    return report_path


def main() -> None:
    args = parse_args()
    try:
        for index, (label, script, extra) in enumerate(PIPELINE_STEPS, start=1):
            run_step(index, args.username, label, script, extra)
        payloads = verify_strict_outputs(args.username)
        if args.smoke_test:
            build_smoke_report(args.username, payloads)
    except (OSError, RuntimeError, TypeError, ValueError) as error:
        print(f"\n[ERREUR] {error}", file=sys.stderr, flush=True)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
