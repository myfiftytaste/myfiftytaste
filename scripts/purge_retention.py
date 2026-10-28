"""Applique les durées de conservation annoncées sur la page Confidentialité (lot 9).

    profils en cache      6 mois après leur dernier calcul
    historique de calcul  24 mois
    journal des tâches    30 jours (jobs terminés seulement)
    retours               24 mois
    empreintes d'IP       24 heures (déjà purgées à chaque requête, rappel ici)
Le Hall of Fame et les badges sont conservés (archive), sauf demande (scripts/delete_user_data.py).

Usage : python scripts/purge_retention.py   (DATABASE_URL dans l'environnement)
"""

import os

import psycopg

RULES = [
    ("profile_cache", "generated_at < now() - interval '6 months'"),
    ("generation_log", "generated_at < now() - interval '24 months'"),
    ("job", "status IN ('done', 'error') AND created_at < now() - interval '30 days'"),
    ("feedback", "created_at < now() - interval '24 months'"),
    ("game_play", "started_at < now() - interval '24 months'"),
    ("api_rate_limit", "window_start < now() - interval '1 day'"),
]


def main() -> None:
    url = os.environ["DATABASE_URL"].replace("postgres://", "postgresql://", 1)
    with psycopg.connect(url) as conn:
        for table, condition in RULES:
            deleted = conn.execute(f"DELETE FROM {table} WHERE {condition}").rowcount
            print(f"{table} : {deleted} ligne(s) supprimée(s)")


if __name__ == "__main__":
    main()
