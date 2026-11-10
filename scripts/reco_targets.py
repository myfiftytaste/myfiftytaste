"""Cibles des recos v2 (10/11/2026) : ce que le pari et le détour vont chercher, la note
qui juge la qualité, l'historique qui évite les redites, le tirage qui tourne chaque mois.

Aucune de ces fonctions n'est bloquante : sans base de données ou sans Megabank, elles
renvoient des valeurs neutres et les recos retombent sur l'ancienne logique.
"""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter, defaultdict
from datetime import datetime, timezone
from math import sqrt
from pathlib import Path
from typing import Any, Optional

BASE_DIR = Path(__file__).resolve().parents[1]
MEGABANK_JSON = BASE_DIR / "data" / "processed" / "megabank_clean.json"

# --- Pari : genre voisin -------------------------------------------------------------
BRIDGE_MAX_USER_SHARE = 0.05  # le genre visé pèse moins de 5 % de tes genres
BRIDGE_EXCLUDED = {"Documentary", "TV Movie", "Music", "Family"}  # Famille = films pour enfants, pas un pari
BRIDGE_TARGETS = 2

# --- Qualité : note Letterboxd, sinon note TMDB pondérée ------------------------------
# Un film avec peu de votes TMDB est ramené vers la moyenne générale : 9,0 sur 40 votes
# ne vaut plus un chef-d'œuvre (cas d'Avatar Aang, 9,0 sur TMDB, 3,72 sur Letterboxd).
WEIGHTED_PRIOR_VOTES = 300
WEIGHTED_PRIOR_RATING = 3.1  # sur 5
QUALITY_FLOOR = 3.2  # sur 5

HISTORY_GENERATIONS = 3

# --- Détour : pays principal ----------------------------------------------------------
# (nom affiché dans Fifty, code ISO TMDB, autres noms rencontrés). L'ordre sert de repli
# quand les profils proches ne disent rien : cinématographies les plus riches d'abord.
DETOUR_COUNTRIES: list[tuple[str, str, tuple[str, ...]]] = [
    ("France", "FR", ()), ("Japan", "JP", ()), ("Italy", "IT", ()), ("South Korea", "KR", ("Korea",)),
    ("UK", "GB", ("United Kingdom",)), ("USA", "US", ("United States of America", "United States")),
    ("Germany", "DE", ("West Germany", "East Germany")), ("Spain", "ES", ()), ("Hong Kong", "HK", ()),
    ("Iran", "IR", ()), ("Denmark", "DK", ()), ("Sweden", "SE", ()), ("Taiwan", "TW", ()),
    ("China", "CN", ()), ("Mexico", "MX", ()), ("Brazil", "BR", ()), ("Argentina", "AR", ()),
    ("Belgium", "BE", ()), ("Poland", "PL", ()), ("Russia", "RU", ("USSR", "Soviet Union")),
    ("India", "IN", ()), ("Canada", "CA", ()), ("Australia", "AU", ()), ("Norway", "NO", ()),
    ("Finland", "FI", ()), ("Czechia", "CZ", ("Czech Republic", "Czechoslovakia")), ("Hungary", "HU", ()),
    ("Romania", "RO", ()), ("Greece", "GR", ()), ("Turkey", "TR", ()), ("Israel", "IL", ()),
    ("Thailand", "TH", ()), ("Philippines", "PH", ()), ("Chile", "CL", ()), ("Colombia", "CO", ()),
    ("Portugal", "PT", ()), ("Netherlands", "NL", ()), ("Austria", "AT", ()), ("Switzerland", "CH", ()),
    ("Ireland", "IE", ()), ("Iceland", "IS", ()), ("Senegal", "SN", ()), ("Egypt", "EG", ()),
    ("Tunisia", "TN", ()), ("Lebanon", "LB", ()), ("Georgia", "GE", ()), ("Ukraine", "UA", ()),
    ("New Zealand", "NZ", ()), ("Indonesia", "ID", ()), ("South Africa", "ZA", ()),
]
NAME_TO_ISO: dict[str, str] = {}
for _name, _iso, _aliases in DETOUR_COUNTRIES:
    for _alias in (_name, *_aliases):
        NAME_TO_ISO[_alias] = _iso
ISO_TO_NAME = {iso: name for name, iso, _ in DETOUR_COUNTRIES}
DETOUR_TARGETS = 2
SIMILAR_PROFILES = 8


def month_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def seeded_index(username: Optional[str], slot: str, count: int) -> int:
    """Tirage stable dans le mois, différent d'un mois à l'autre et d'une place à l'autre."""
    if count <= 1:
        return 0
    digest = hashlib.sha256(f"{username or ''}:{month_key()}:{slot}".encode("utf-8")).hexdigest()
    return int(digest, 16) % count


def iso_for(country: Any) -> Optional[str]:
    return NAME_TO_ISO.get(str(country).strip()) if country else None


# --- Pari ------------------------------------------------------------------------------

def _megabank() -> list[dict[str, Any]]:
    try:
        return json.loads(MEGABANK_JSON.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return []


def bridge_targets(genre_weights: dict[str, float]) -> list[dict[str, Any]]:
    """Genres presque absents de ton profil mais souvent associés à ceux que tu aimes, d'après
    les ~10 000 films de la Megabank. Renvoie [{target, partner, strength}] du plus fort au moins fort."""
    pair_counts: dict[str, Counter[str]] = defaultdict(Counter)
    genre_counts: Counter[str] = Counter()
    records = _megabank()
    total_films = len(records) or 1
    for record in records:
        genres = {g for g in record.get("genres") or [] if g}
        genre_counts.update(genres)
        for genre in genres:
            pair_counts[genre].update(genres - {genre})
    if not genre_counts or not genre_weights:
        return []

    scored = []
    for target in genre_counts:
        if target in BRIDGE_EXCLUDED or genre_weights.get(target, 0.0) >= BRIDGE_MAX_USER_SHARE:
            continue
        # Affinité (lift) : à quel point le genre visé accompagne un genre aimé plus souvent que
        # le hasard. Sans elle, « Action », très fréquent partout, gagnerait pour tout le monde.
        target_share = genre_counts[target] / total_films
        contributions = {
            partner: weight * (pair_counts[partner][target] / genre_counts[partner]) / target_share
            for partner, weight in genre_weights.items()
            if partner in genre_counts and partner != target and partner not in BRIDGE_EXCLUDED
        }
        if not contributions:
            continue
        partner = max(contributions, key=contributions.get)
        scored.append({"target": target, "partner": partner, "strength": sum(contributions.values())})
    scored.sort(key=lambda item: item["strength"], reverse=True)
    top = scored[:BRIDGE_TARGETS]
    best = top[0]["strength"] if top else 1.0
    for item in top:
        item["strength"] = item["strength"] / best if best else 0.0
    return top


# --- Qualité ---------------------------------------------------------------------------

def quality_rating(record: dict[str, Any], letterboxd_rating: Optional[float]) -> float:
    """Note sur 5 : moyenne Letterboxd si on la connaît, sinon note TMDB pondérée par les votes."""
    if letterboxd_rating:
        return float(letterboxd_rating)
    average = record.get("average_rating")
    votes = record.get("tmdb_vote_count") or 0
    if not isinstance(average, (int, float)):
        return WEIGHTED_PRIOR_RATING
    return (votes * average + WEIGHTED_PRIOR_VOTES * WEIGHTED_PRIOR_RATING) / (votes + WEIGHTED_PRIOR_VOTES)


# --- Base de données : historique et profils proches -----------------------------------

def _connect():
    url = os.environ.get("DATABASE_URL")
    if not url:
        return None
    try:
        import psycopg

        return psycopg.connect(url.replace("postgres://", "postgresql://", 1), connect_timeout=10)
    except Exception as error:  # noqa: BLE001
        print(f"[reco] base indisponible (non bloquant) : {error}")
        return None


def recent_reco_slugs(username: str) -> set[str]:
    """Recos des 3 dernières générations du pseudo (generation_log.reco_slugs)."""
    conn = _connect()
    if conn is None:
        return set()
    try:
        with conn:
            rows = conn.execute(
                "SELECT reco_slugs FROM generation_log WHERE username = %s AND reco_slugs IS NOT NULL "
                "ORDER BY generated_at DESC LIMIT %s",
                (username.lower(), HISTORY_GENERATIONS),
            ).fetchall()
        return {slug for (value,) in rows for slug in str(value).split(",") if slug}
    except Exception as error:  # noqa: BLE001
        print(f"[reco] historique indisponible (non bloquant) : {error}")
        return set()


def _genre_vector(films: list[dict[str, Any]]) -> dict[str, float]:
    counter: Counter[str] = Counter(g for film in films for g in film.get("genres") or [] if g)
    total = sum(counter.values()) or 1
    return {genre: count / total for genre, count in counter.items()}


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    dot = sum(value * b.get(key, 0.0) for key, value in a.items())
    norm = sqrt(sum(v * v for v in a.values())) * sqrt(sum(v * v for v in b.values()))
    return dot / norm if norm else 0.0


def detour_targets(username: str, genre_weights: dict[str, float], seen_countries: set[str]) -> list[str]:
    """Pays (codes ISO) que tu n'as pas vus : d'abord ceux qu'ont aimés les profils Fifty qui te
    ressemblent (mêmes genres), sinon les grandes cinématographies, tirées au sort chaque mois."""
    seen_iso = {iso for iso in (iso_for(country) for country in seen_countries) if iso}
    unseen = [iso for _, iso, _ in DETOUR_COUNTRIES if iso not in seen_iso]
    if not unseen:
        return []

    votes: Counter[str] = Counter()
    conn = _connect()
    if conn is not None:
        try:
            with conn:
                rows = conn.execute(
                    "SELECT username, films FROM profile_cache WHERE username <> %s AND films IS NOT NULL",
                    (username.lower(),),
                ).fetchall()
            neighbours = sorted(
                ((_cosine(genre_weights, _genre_vector(films or [])), films or []) for _user, films in rows),
                key=lambda item: item[0],
                reverse=True,
            )[:SIMILAR_PROFILES]
            for similarity, films in neighbours:
                if similarity <= 0:
                    continue
                for film in films:
                    rating = film.get("user_rating")
                    if rating is not None and rating < 3.5:
                        continue
                    iso = iso_for((film.get("countries") or [None])[0])
                    if iso in unseen:
                        votes[iso] += similarity
        except Exception as error:  # noqa: BLE001
            print(f"[reco] profils proches indisponibles (non bloquant) : {error}")

    picked = [iso for iso, _ in votes.most_common(DETOUR_TARGETS)]
    # Repli (ou complément) : une grande cinématographie non vue, différente chaque mois.
    shortlist = [iso for iso in unseen[:8] if iso not in picked]
    while len(picked) < DETOUR_TARGETS and shortlist:
        picked.append(shortlist.pop(seeded_index(username, f"detour-{len(picked)}", len(shortlist))))
    return picked
