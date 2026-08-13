import { NextRequest } from "next/server";
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

// Rate limit par IP sur la création de job (architecture-v1-dynamique.md
// §4, runbook phase 6) : ne protège que la création de job, pas les lectures
// de cache (une visite répétée de son propre profil ne coûte rien au
// pipeline, inutile de la freiner). Fenêtre fixe, ajustable comme
// PROFILE_FRESHNESS_HOURS ci-dessus. Une IP peut être partagée par plusieurs
// personnes (box, réseau d'entreprise) : garder la limite large plutôt que
// stricte, et un message qui ne fait pas peser la faute sur l'utilisateur.
export const RATE_LIMIT_MAX_REQUESTS = 5;
export const RATE_LIMIT_WINDOW_MINUTES = 10;

/** x-forwarded-for est posé de façon fiable par Vercel ; ce n'est pas exploitable côté
 * navigateur (jamais exposé au client), donc pas de risque de usurpation depuis le front. */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

/** Incrémente le compteur de la fenêtre courante pour cette IP (la remet à 1 si la
 * fenêtre précédente est expirée) et renvoie true si la requête reste sous la limite. */
export async function withinRateLimit(pool: Pool, ip: string): Promise<boolean> {
  const result = await pool.query<{ request_count: number }>(
    `INSERT INTO api_rate_limit (ip_address, window_start, request_count)
     VALUES ($1, now(), 1)
     ON CONFLICT (ip_address) DO UPDATE SET
       request_count = CASE
         WHEN api_rate_limit.window_start < now() - ($2 * interval '1 minute') THEN 1
         ELSE api_rate_limit.request_count + 1
       END,
       window_start = CASE
         WHEN api_rate_limit.window_start < now() - ($2 * interval '1 minute') THEN now()
         ELSE api_rate_limit.window_start
       END
     RETURNING request_count`,
    [ip, RATE_LIMIT_WINDOW_MINUTES],
  );
  const count = result.rows[0]?.request_count ?? 0;
  return count <= RATE_LIMIT_MAX_REQUESTS;
}
