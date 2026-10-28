import { getPool } from "./db";

// Statistiques de la communauté Fifty, tirées de generation_log (une ligne par génération) :
// la dernière génération de chaque pseudo compte une fois. Recalculées au plus une fois par
// heure et par instance serveur : la moyenne s'enrichit au fil des connexions.
export type RuntimeStats = { average: number; low: number; high: number; count: number };

const CACHE_MS = 60 * 60 * 1000;
// En dessous, l'échelle et la moyenne ne disent rien : repli sur l'échelle fixe.
const MIN_PROFILES = 10;
let cached: { at: number; value: RuntimeStats | null } | null = null;

export async function getRuntimeStats(): Promise<RuntimeStats | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  let value: RuntimeStats | null = null;
  try {
    const { rows } = await getPool().query<{ average: string; p5: string; p95: string; count: string }>(
      `SELECT avg(m) AS average,
              percentile_cont(0.05) WITHIN GROUP (ORDER BY m) AS p5,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY m) AS p95,
              count(*) AS count
       FROM (SELECT DISTINCT ON (username) average_runtime_minutes AS m
             FROM generation_log
             WHERE average_runtime_minutes IS NOT NULL
             ORDER BY username, generated_at DESC) latest`,
    );
    const row = rows[0];
    if (row && Number(row.count) >= MIN_PROFILES) {
      // Bornes arrondies à 5 min, au moins 30 min d'écart, pour une échelle lisible.
      let low = Math.floor(Number(row.p5) / 5) * 5;
      let high = Math.ceil(Number(row.p95) / 5) * 5;
      if (high - low < 30) {
        const middle = (low + high) / 2;
        low = Math.floor((middle - 15) / 5) * 5;
        high = low + 30;
      }
      value = { average: Number(row.average), low, high, count: Number(row.count) };
    }
  } catch (error) {
    console.error("fiftyStats: runtime", error instanceof Error ? error.message : error);
  }
  cached = { at: Date.now(), value };
  return value;
}
