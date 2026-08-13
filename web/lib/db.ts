import { Pool } from "pg";

// Serveur uniquement (module "pg"). Ne jamais importer ce fichier depuis un
// composant "use client" — même piège que web/lib/badges.ts avec "fs" :
// webpack embarquerait le driver Postgres dans le bundle navigateur et le
// build échouerait.
//
// DATABASE_URL est lue depuis l'environnement, jamais en dur. En local elle
// vient du .env racine (chargé par next.config.mjs) ; sur Vercel c'est la
// chaîne Neon poolée saisie dans les Environment Variables du projet — pas
// la directe, pour éviter de saturer les connexions depuis des fonctions
// serverless (architecture-v1-dynamique.md section 3, runbook phase 4).

let pool: Pool | null = null;

function connectionString(): string {
  const url = (process.env.DATABASE_URL ?? "").trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL n'est pas définie. Ajoute-la dans le .env à la racine du dépôt (voir README.md).",
    );
  }
  // Même piège que scripts/migrate.py et worker.py : certaines chaînes
  // fournies par l'hébergeur commencent par postgres:// et font échouer
  // certains clients.
  return url.startsWith("postgres://") ? "postgresql://" + url.slice("postgres://".length) : url;
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: connectionString(),
      // Chaque fonction serverless peut créer son propre pool à froid ; la
      // chaîne poolée Neon multiplexe déjà en dessous, donc un pool Node
      // modeste ici suffit et évite d'empiler les connexions.
      max: 5,
    });
  }
  return pool;
}

/** Normalise un pseudo comme le reste du système : trim, @ initial retiré, minuscules. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

// Même règle que job.username / profile_cache.username côté base
// (contrainte CHECK) et que USERNAME_RE dans scripts/build_full_profile.py.
export const USERNAME_PATTERN = /^[A-Za-z0-9_-]+$/;

// Règle "profil frais" volontairement simple et explicite (pas de vrai
// système de TTL/cache pour l'instant — prévu phase 6 du runbook). Ajuster
// cette seule constante suffit à changer le comportement.
export const PROFILE_FRESHNESS_HOURS = 24;

export function isFresh(generatedAt: Date): boolean {
  const ageMs = Date.now() - generatedAt.getTime();
  return ageMs < PROFILE_FRESHNESS_HOURS * 60 * 60 * 1000;
}
