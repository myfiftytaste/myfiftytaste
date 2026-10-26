"""Sentinelle : échoue (code 1) si la file ou le worker semblent bloqués.

Lancée toutes les heures par .github/workflows/sentinelle.yml (DATABASE_URL en secret). Un échec
de workflow planifié déclenche un e-mail de GitHub : c'est l'alerte. Si le jeton GH_dispatch_token
du site expire, les jobs restent `queued` et cette sentinelle sonne.

N'affiche que des chiffres, jamais de pseudos (les logs d'un workflow sont publics).
"""

from __future__ import annotations

import sys

from hall_of_fame_common import connect

MAX_QUEUED_MINUTES = 20
MAX_ERRORS_24H = 3
# Erreurs causées par la personne (pseudo mal tapé, compte privé, aucun film) : normales, pas une panne.
USER_ERROR_CODES = ("user_not_found", "profile_private", "no_films")


def problems(old_queued: int, technical_errors_24h: int) -> list[str]:
    found = []
    if old_queued > 0:
        found.append(f"{old_queued} job(s) en file depuis plus de {MAX_QUEUED_MINUTES} min")
    if technical_errors_24h > MAX_ERRORS_24H:
        found.append(f"{technical_errors_24h} erreurs techniques en 24 h (seuil : {MAX_ERRORS_24H})")
    return found


def main() -> int:
    conn = connect()
    old_queued = conn.execute(
        "SELECT count(*) AS n FROM job WHERE status = 'queued' AND created_at < now() - %s * interval '1 minute'",
        (MAX_QUEUED_MINUTES,),
    ).fetchone()["n"]
    technical_errors = conn.execute(
        """
        SELECT count(*) AS n FROM job
        WHERE status = 'error' AND finished_at > now() - interval '24 hours'
          AND error_code <> ALL(%s)
        """,
        (list(USER_ERROR_CODES),),
    ).fetchone()["n"]
    print(f"jobs en file depuis plus de {MAX_QUEUED_MINUTES} min : {old_queued}")
    print(f"erreurs techniques sur 24 h : {technical_errors}")

    found = problems(old_queued, technical_errors)
    for line in found:
        print(f"ALERTE : {line}", file=sys.stderr)
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
