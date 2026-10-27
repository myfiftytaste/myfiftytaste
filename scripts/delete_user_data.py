"""Supprime toutes les données d'un pseudo (demande d'effacement, page Confidentialité).

Usage : python scripts/delete_user_data.py <pseudo> [--exclude]
  --exclude  ajoute aussi le pseudo à data/processed/excluded_usernames.json (droit d'opposition) :
             le worker refusera ensuite de le calculer. Committer ce fichier.
Montre ce qui sera supprimé et demande confirmation avant d'agir.
"""

import json
import os
import sys
from pathlib import Path

import psycopg

TABLES = ["profile_cache", "generation_log", "job", "monthly_snapshot", "badge", "feedback"]
EXCLUDED = Path(__file__).resolve().parent.parent / "data" / "processed" / "excluded_usernames.json"


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    username = sys.argv[1].strip().lstrip("@").lower()
    url = os.environ["DATABASE_URL"].replace("postgres://", "postgresql://", 1)
    with psycopg.connect(url) as conn:
        counts = {t: conn.execute(f"SELECT count(*) FROM {t} WHERE username = %s", (username,)).fetchone()[0] for t in TABLES}
        print(f"{username} : " + ", ".join(f"{t} {n}" for t, n in counts.items()))
        if input("Supprimer ? (oui/non) ").strip().lower() != "oui":
            raise SystemExit("Rien n'a été supprimé.")
        with conn.transaction():
            for table in TABLES:
                conn.execute(f"DELETE FROM {table} WHERE username = %s", (username,))
    print("Supprimé.")
    if "--exclude" in sys.argv:
        names = sorted(set(json.loads(EXCLUDED.read_text(encoding="utf-8"))) | {username})
        EXCLUDED.write_text(json.dumps(names, indent=1) + "\n", encoding="utf-8")
        print(f"Ajouté à {EXCLUDED.name} : pense à committer ce fichier.")


if __name__ == "__main__":
    main()
