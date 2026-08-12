"""Applique les migrations SQL versionnees du dossier migrations/.

Usage:
    python scripts/migrate.py              # applique les migrations en attente
    python scripts/migrate.py --status     # liste sans rien appliquer
    python scripts/migrate.py --dry-run    # idem --status (alias explicite)

La connexion se fait via la variable d'environnement DATABASE_URL, chargee
depuis .env si present (meme convention que TMDB_API_KEY dans le reste du
pipeline). Aucune chaine de connexion n'est ecrite en dur.

Pour les migrations, utiliser la chaine Neon DIRECTE (non poolee) : le pooler
supporte mal le DDL et les transactions longues (runbook phase 0).

Chaque fichier est applique dans SA PROPRE transaction, puis enregistre dans
la table schema_migrations. Une migration qui echoue est integralement
annulee ; les precedentes restent appliquees.
"""

from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path

try:
    import psycopg
except ImportError:  # pragma: no cover - depend de l'environnement local
    raise SystemExit(
        "psycopg n'est pas installe.\n"
        "Lance : pip install -r requirements.txt"
    )

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None

BASE_DIR = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = BASE_DIR / "migrations"


def database_url() -> str:
    if load_dotenv is not None:
        load_dotenv(BASE_DIR / ".env")

    url = (os.environ.get("DATABASE_URL") or "").strip()
    if not url:
        raise SystemExit(
            "DATABASE_URL n'est pas definie.\n"
            "Ajoute-la dans le fichier .env a la racine du depot (il est deja\n"
            "ignore par git), ou exporte-la dans ton shell.\n"
            "Utilise la chaine Neon DIRECTE, pas la poolee."
        )

    # Piege releve dans le runbook (phase 3) : selon la bibliotheque, une
    # chaine en `postgres://` echoue la ou `postgresql://` passe. Neon et
    # Railway fournissent parfois l'ancienne forme.
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]

    return url


def discover_migrations() -> list[Path]:
    if not MIGRATIONS_DIR.exists():
        raise SystemExit(f"Dossier introuvable : {MIGRATIONS_DIR}")
    # Tri lexicographique : le prefixe numerique a largeur fixe (001_, 002_)
    # garantit que l'ordre alphabetique est l'ordre chronologique.
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


def checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ensure_tracking_table(conn: psycopg.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename    text        PRIMARY KEY,
            checksum    text        NOT NULL,
            applied_at  timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    conn.commit()


def applied_migrations(conn: psycopg.Connection) -> dict[str, str]:
    rows = conn.execute("SELECT filename, checksum FROM schema_migrations").fetchall()
    return {filename: file_checksum for filename, file_checksum in rows}


def warn_on_modified(migrations: list[Path], applied: dict[str, str]) -> None:
    """Signale une migration deja appliquee dont le contenu a change depuis.

    Ne bloque pas : la base reste dans l'etat de la version appliquee. Mais
    c'est le signe que le depot et la base ont diverge, ce qui est exactement
    ce que ce systeme est cense rendre visible.
    """
    for path in migrations:
        recorded = applied.get(path.name)
        if recorded is not None and recorded != checksum(path):
            print(
                f"  ATTENTION : {path.name} a ete modifie depuis son application.\n"
                f"              La base reflete l'ancienne version. Cree plutot\n"
                f"              une nouvelle migration que d'editer celle-ci.",
                file=sys.stderr,
            )


def main() -> None:
    args = set(sys.argv[1:])
    unknown = args - {"--status", "--dry-run"}
    if unknown:
        raise SystemExit(f"Option inconnue : {', '.join(sorted(unknown))}")
    read_only = bool(args)

    migrations = discover_migrations()
    if not migrations:
        print("Aucune migration dans migrations/.")
        return

    with psycopg.connect(database_url()) as conn:
        ensure_tracking_table(conn)
        applied = applied_migrations(conn)
        warn_on_modified(migrations, applied)

        pending = [path for path in migrations if path.name not in applied]

        print(f"{len(migrations)} migration(s) au total, {len(pending)} en attente.")
        for path in migrations:
            marker = "applique" if path.name in applied else "EN ATTENTE"
            print(f"  [{marker}] {path.name}")

        if read_only:
            print("\nMode lecture seule : rien n'a ete applique.")
            return

        if not pending:
            print("\nLa base est a jour.")
            return

        print()
        for path in pending:
            print(f"Application de {path.name} ...", end=" ", flush=True)
            try:
                with conn.transaction():
                    conn.execute(path.read_text(encoding="utf-8"))
                    conn.execute(
                        "INSERT INTO schema_migrations (filename, checksum) VALUES (%s, %s)",
                        (path.name, checksum(path)),
                    )
            except Exception as error:
                print("ECHEC")
                raise SystemExit(
                    f"\n{path.name} a echoue, la migration a ete annulee :\n  {error}"
                )
            print("ok")

        print(f"\n{len(pending)} migration(s) appliquee(s).")


if __name__ == "__main__":
    main()
