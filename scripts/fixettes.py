"""Module « Les Fixettes » (maquette A validée le 28/10/2026).

- Cinéaste et interprète qui reviennent le plus dans les 50 films (au moins 2 films, sinon None :
  le site affiche « Pas de cinéaste / d'interprète en double »).
- Interprète = les 4 premiers rôles crédités seulement, pour qu'un second rôle ne passe pas devant
  une tête d'affiche.
- Fact : part des films réalisés par au moins une femme ou une personne non binaire, calculée sur
  les seuls films dont on connaît l'équipe (genre TMDB 1 = femme, 3 = non binaire, 2 = homme,
  0 = non renseigné). Le complément n'est jamais affiché et aucun genre individuel n'est exposé.

Une seule requête TMDB par film (/movie/{id}?append_to_response=credits), qui sert aussi au nombre
de votes de l'onglet Ma liste.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any, Optional

TOP_BILLED = 4
WOMAN_OR_NON_BINARY = {1, 3}
KNOWN_GENDERS = {1, 2, 3}


def compact_details(detail: dict[str, Any]) -> dict[str, Any]:
    """Ce qu'on garde d'une fiche TMDB : votes, réalisation et 4 premiers rôles (sans le reste)."""
    credits = detail.get("credits") or {}

    def person(item: dict[str, Any]) -> dict[str, Any]:
        return {"id": item.get("id"), "name": item.get("name"), "gender": item.get("gender") or 0, "photo": item.get("profile_path")}

    directors = [person(item) for item in credits.get("crew") or [] if item.get("job") == "Director" and item.get("name")]
    cast = sorted((item for item in credits.get("cast") or [] if item.get("name")), key=lambda item: item.get("order", 99))
    return {"votes": detail.get("vote_count"), "directors": directors, "cast": [person(item) for item in cast[:TOP_BILLED]]}


def _film_ref(film: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": film.get("title") or film.get("rss_title"),
        "poster": film.get("rss_poster_url"),
        "url": film.get("letterboxd_url"),
    }


def _favourite(films: list[dict[str, Any]], people_of) -> Optional[dict[str, Any]]:
    by_person: dict[Any, dict[str, Any]] = {}
    seen: dict[Any, list[dict[str, Any]]] = defaultdict(list)
    for film in films:
        for person in people_of(film):
            key = person.get("id") or person.get("name")
            if key is None or any(f is film for f in seen[key]):
                continue
            by_person.setdefault(key, person)
            seen[key].append(film)

    def score(key):
        ratings = [f["user_rating"] for f in seen[key] if isinstance(f.get("user_rating"), (int, float))]
        return (len(seen[key]), sum(ratings) / len(ratings) if ratings else 0)

    if not seen:
        return None
    best = max(seen, key=score)
    if len(seen[best]) < 2:
        return None
    ratings = [f["user_rating"] for f in seen[best] if isinstance(f.get("user_rating"), (int, float))]
    person = by_person[best]
    return {
        "name": person["name"],
        "photo": person.get("photo"),
        "count": len(seen[best]),
        "average_rating": round(sum(ratings) / len(ratings), 2) if ratings else None,
        "films": [_film_ref(f) for f in seen[best]][:3],
    }


def compute_fixettes(films: list[dict[str, Any]], details: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """films : les films du wrapped (ordre de visionnage) ; details : compact_details par id TMDB (str)."""

    def info(film):
        return details.get(str(film.get("rss_tmdb_id"))) or {}

    dots = []
    for film in films:
        genders = {person.get("gender") or 0 for person in info(film).get("directors") or []}
        if genders & WOMAN_OR_NON_BINARY:
            dots.append("y")
        elif genders and genders <= KNOWN_GENDERS:
            dots.append("n")
        else:
            dots.append("u")
    known = sum(1 for dot in dots if dot != "u")
    yes = dots.count("y")
    return {
        "director": _favourite(films, lambda film: info(film).get("directors") or []),
        "performer": _favourite(films, lambda film: info(film).get("cast") or []),
        "facts": {
            "share": round(yes / known, 3) if known else None,
            "known": known,
            "total": len(films),
            "dots": dots,
            # Les films concernés, listés à côté du pourcentage (retour du 28/10/2026).
            "films": [_film_ref(film) for film, dot in zip(films, dots) if dot == "y"],
        },
    }
