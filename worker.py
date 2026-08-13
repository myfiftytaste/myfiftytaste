"""Worker V1 dynamique — traite les jobs de génération de profil.

Boucle infinie (runbook, phase 2) :
    prend un job 'queued' (verrouillage atomique via FOR UPDATE SKIP LOCKED,
      pour que deux workers ne puissent jamais traiter le même job)
    passe en 'running'
    pour chaque étape 1..8 du pipeline existant (build_full_profile.PIPELINE_STEPS) :
        met à jour current_step + step_label
        exécute l'étape (appelle les scripts existants tels quels, ne les
        réécrit pas)
    lit les sorties JSON du pipeline et les écrit dans profile_cache
    passe en 'done'
    en cas d'échec : 'error' + error_code

À lancer et vérifier EN LOCAL avant tout déploiement Railway :
    1. insérer un job 'queued' à la main dans Neon
    2. python worker.py
    3. observer current_step progresser de 1 à 8, puis le profil apparaître
       dans profile_cache

Root Directory Railway (phase 3 du runbook) : ce fichier vit à la racine du
dépôt, comme scripts/, data/ et requirements.txt — pas de sous-dossier
"moteur" séparé du monorepo. Start command : `python worker.py`.

Classification des erreurs : distinction fine des 5 error_code à partir des
messages émis par les scripts existants (build_user_wrapped.py notamment) —
voir classify_error(). Le retry/backoff sur les 429 et erreurs réseau vit
dans scripts/build_user_wrapped.py (fetch_rss), pas ici : c'est l'étape qui
parle à Letterboxd.

Jobs zombies (phase 6 du runbook) : sweep_zombie_jobs(), appelé à chaque tour
de la boucle ci-dessous.
"""

from __future__ import annotations

import json
import os
import re
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Optional

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "data" / "output"

sys.path.insert(0, str(BASE_DIR / "scripts"))
from build_full_profile import PIPELINE_STEPS, USERNAME_RE  # noqa: E402
from build_monthly_snapshot import build_snapshot, current_month  # noqa: E402

POLL_INTERVAL_SECONDS = 3

# Un job 'running' depuis plus longtemps que ça est considéré zombie (le
# worker qui le traitait a été tué, typiquement par un redéploiement Railway
# en plein pipeline) et repasse en 'error'. 15 min = marge au-dessus du pire
# cas réaliste : 2 fetch Letterboxd avec leur backoff plafonné (jusqu'à
# ~30 s chacun) + l'enrichissement TMDB de 50 films. 10 min s'est révélé trop
# juste et risquait de tuer des jobs encore légitimes.
ZOMBIE_JOB_TIMEOUT_MINUTES = 15

# error_code candidats, dans l'ordre de verification. Le premier motif qui
# matche le stderr d'une etape en echec l'emporte.
RSS_STATUS_RE = re.compile(r"RSS fetch failed \((\d+)\)")
RSS_STATUS_TO_ERROR_CODE = {
    404: "user_not_found",
    403: "profile_private",
    410: "profile_private",
    429: "rate_limited",
}
NO_FILMS_MARKERS = (
    "No /film/ items found in RSS",
    "Aucun film détecté",
)


def classify_error(stderr: str) -> str:
    # Retry/backoff épuisé (429 ou erreurs réseau à répétition) : marqueur
    # posé par fetch_rss() dans scripts/build_user_wrapped.py, à vérifier
    # avant la regex de statut HTTP ci-dessous (les deux peuvent apparaître
    # dans le même message).
    if "(rate_limited)" in stderr:
        return "rate_limited"
    match = RSS_STATUS_RE.search(stderr)
    if match:
        return RSS_STATUS_TO_ERROR_CODE.get(int(match.group(1)), "internal_error")
    if any(marker in stderr for marker in NO_FILMS_MARKERS):
        return "no_films"
    return "internal_error"


def database_url() -> str:
    if load_dotenv is not None:
        load_dotenv(BASE_DIR / ".env")
    url = (os.environ.get("DATABASE_URL") or "").strip()
    if not url:
        raise SystemExit("DATABASE_URL n'est pas définie (voir README.md).")
    # Même piège que scripts/migrate.py : certaines chaînes fournies par
    # l'hébergeur commencent par postgres:// et font échouer psycopg.
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    return url


def connect() -> psycopg.Connection:
    return psycopg.connect(database_url(), autocommit=True, row_factory=dict_row)


def claim_next_job(conn: psycopg.Connection) -> Optional[dict[str, Any]]:
    """Prend atomiquement le plus ancien job 'queued', ou None si la file est vide.

    Un seul aller-retour SQL : le SELECT interne verrouille et saute les
    lignes déjà verrouillées (SKIP LOCKED), l'UPDATE externe fait la
    transition d'état. Deux workers qui appellent ceci en même temps ne
    peuvent jamais récupérer le même job.
    """
    return conn.execute(
        """
        UPDATE job
        SET status = 'running', started_at = now()
        WHERE id = (
            SELECT id FROM job
            WHERE status = 'queued'
            ORDER BY created_at
            FOR UPDATE SKIP LOCKED
            LIMIT 1
        )
        RETURNING id, username, display_username
        """
    ).fetchone()


def sweep_zombie_jobs(conn: psycopg.Connection) -> None:
    """Repasse en 'error' tout job 'running' depuis plus de
    ZOMBIE_JOB_TIMEOUT_MINUTES : sans ça, un redéploiement Railway en plein
    job laisse l'utilisateur devant un écran de chargement éternel, puisque
    plus aucun worker ne mettra jamais ce job à jour.

    Appelé à chaque tour de boucle plutôt qu'un cron séparé : le nouveau
    worker qui démarre après un redéploiement s'auto-guérit dès son premier
    passage, sans infra supplémentaire. UPDATE ... WHERE utilise l'index
    partiel job_running_started_at_idx (migrations/001_initial_schema.sql),
    posé pour cet usage.
    """
    zombies = conn.execute(
        """
        UPDATE job
        SET status = 'error', error_code = 'internal_error', finished_at = now()
        WHERE status = 'running'
          AND started_at < now() - (%s * interval '1 minute')
        RETURNING id, username
        """,
        (ZOMBIE_JOB_TIMEOUT_MINUTES,),
    ).fetchall()
    for zombie in zombies:
        print(f"[job {zombie['id']}] zombie ({zombie['username']}) repassé en error", file=sys.stderr, flush=True)


def update_progress(conn: psycopg.Connection, job_id: str, index: int, label: str) -> None:
    conn.execute(
        "UPDATE job SET current_step = %s, step_label = %s WHERE id = %s",
        (index, label, job_id),
    )


def run_step(username: str, script: str, extra: list[str]) -> subprocess.CompletedProcess:
    command = [sys.executable, str(BASE_DIR / "scripts" / script), username, *extra]
    return subprocess.run(command, cwd=BASE_DIR, capture_output=True, text=True)


def load_json(path: Path) -> Optional[dict[str, Any]]:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def finalize_success(conn: psycopg.Connection, job: dict[str, Any], username: str) -> None:
    display_profile = load_json(OUTPUT_DIR / f"{username}_display_profile.json")
    if display_profile is None:
        raise RuntimeError(f"display_profile introuvable pour '{username}' après un pipeline réussi")
    metrics = load_json(OUTPUT_DIR / f"{username}_profile_metrics.json")
    recommendations = load_json(OUTPUT_DIR / f"{username}_recommendations.json")

    with conn.transaction():
        conn.execute(
            """
            INSERT INTO profile_cache (username, display_username, display_profile, metrics, recommendations, generated_at)
            VALUES (%s, %s, %s, %s, %s, now())
            ON CONFLICT (username) DO UPDATE SET
                display_username = EXCLUDED.display_username,
                display_profile  = EXCLUDED.display_profile,
                metrics          = EXCLUDED.metrics,
                recommendations  = EXCLUDED.recommendations,
                generated_at     = now()
            """,
            (
                username.lower(),
                username,
                Jsonb(display_profile),
                Jsonb(metrics) if metrics is not None else None,
                Jsonb(recommendations) if recommendations is not None else None,
            ),
        )
        conn.execute(
            "UPDATE job SET status = 'done', finished_at = now() WHERE id = %s",
            (job["id"],),
        )

    # Best-effort, hors de la transaction ci-dessus : le Hall of Fame est une
    # fonctionnalité secondaire (Hall of Fame brief), un bug ici ne doit
    # jamais faire échouer une génération de profil par ailleurs réussie.
    try:
        freeze_monthly_snapshot(conn, job, username)
    except Exception as error:  # noqa: BLE001 - best-effort assumé, voir commentaire ci-dessus
        print(f"[job {job['id']}] échec du gel du snapshot HOF (non bloquant) : {error}", file=sys.stderr, flush=True)


def freeze_monthly_snapshot(conn: psycopg.Connection, job: dict[str, Any], username: str) -> None:
    """Gèle un monthly_snapshot pour le mois en cours, la première fois qu'un
    profil est généré ce mois-ci (Hall of Fame brief, section 3.2 : "whichever
    values were true the first time someone showed up this month are the
    values that count"). ON CONFLICT DO NOTHING sur la PK (month, username) :
    les visites suivantes du même mois ne recalculent jamais un snapshot déjà
    gelé, exactement comme le faisait l'ancienne version fichier
    (build_monthly_snapshot.main : "already exists — returning it unchanged").

    build_snapshot() lit les mêmes fichiers data/output/{username}_*.json que
    finalize_success() vient de lire pour profile_cache : le pipeline venant
    de réussir, ils sont garantis présents.
    """
    month = current_month()
    snapshot = build_snapshot(username, month)
    conn.execute(
        """
        INSERT INTO monthly_snapshot
            (month, username, display_username, first_seen_at, metrics_snapshot, continent_consumption, continent_films)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (month, username) DO NOTHING
        """,
        (
            month,
            username.lower(),
            username,
            snapshot["first_seen_at"],
            Jsonb(snapshot["metrics_snapshot"]),
            Jsonb(snapshot["continent_consumption"]),
            Jsonb(snapshot["continent_films"]),
        ),
    )


def finalize_error(conn: psycopg.Connection, job: dict[str, Any], error_code: str, message: str) -> None:
    conn.execute(
        "UPDATE job SET status = 'error', error_code = %s, finished_at = now() WHERE id = %s",
        (error_code, job["id"]),
    )
    print(f"[job {job['id']}] échec ({error_code}) : {message}", file=sys.stderr, flush=True)


def process_job(conn: psycopg.Connection, job: dict[str, Any]) -> None:
    job_id = job["id"]
    username = job["display_username"] or job["username"]
    print(f"\n=== job {job_id} : {username} ===", flush=True)

    if not USERNAME_RE.fullmatch(username):
        finalize_error(conn, job, "user_not_found", f"username invalide : {username!r}")
        return

    for index, (label, script, extra) in enumerate(PIPELINE_STEPS, start=1):
        update_progress(conn, job_id, index, label)
        print(f"[{index}/{len(PIPELINE_STEPS)}] {label}", flush=True)

        result = run_step(username, script, extra)
        if result.stdout:
            print(result.stdout, end="")
        if result.returncode != 0:
            if result.stderr:
                print(result.stderr, file=sys.stderr, end="")
            error_code = classify_error(result.stderr or "")
            finalize_error(conn, job, error_code, f"étape {index}/8 ({script}), code {result.returncode}")
            return

    try:
        finalize_success(conn, job, username)
    except Exception as error:  # noqa: BLE001 - toute erreur ici doit debloquer le job, pas planter le worker
        finalize_error(conn, job, "internal_error", str(error))
        return

    print(f"[job {job_id}] terminé : {username}", flush=True)


_shutdown_requested = False


def _request_shutdown(signum: int, frame: Any) -> None:
    global _shutdown_requested
    _shutdown_requested = True
    print("\nSignal d'arrêt reçu, fin après le job en cours...", flush=True)


def main() -> None:
    signal.signal(signal.SIGINT, _request_shutdown)
    signal.signal(signal.SIGTERM, _request_shutdown)

    once = "--once" in sys.argv[1:]

    conn = connect()
    print("Worker démarré, en attente de jobs 'queued'..." + (" (mode --once)" if once else ""), flush=True)

    while not _shutdown_requested:
        sweep_zombie_jobs(conn)
        job = claim_next_job(conn)
        if job is None:
            if once:
                print("Aucun job en attente.", flush=True)
                break
            time.sleep(POLL_INTERVAL_SECONDS)
            continue

        try:
            process_job(conn, job)
        except Exception as error:  # noqa: BLE001 - filet de securite ultime
            # process_job capture déjà ses propres échecs ; ceci ne devrait
            # normalement jamais s'exécuter. Sans ce filet, un bug ici
            # laisserait le job coincé en 'running' pour toujours.
            print(f"[job {job['id']}] erreur worker inattendue : {error}", file=sys.stderr, flush=True)
            try:
                finalize_error(conn, job, "internal_error", str(error))
            except Exception:  # noqa: BLE001
                pass

        if once:
            break

    print("Worker arrêté proprement.", flush=True)


if __name__ == "__main__":
    main()
