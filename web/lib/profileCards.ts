import { getPool, normalizeUsername } from "./db";
import { selectDisplayBadges, type Badge } from "./badgeSelection";
import type { ProfileCardData } from "./hallOfFameTypes";

// Serveur uniquement. Encadré de profil des bulles du Hall of Fame (10/11/2026) : badges affichés
// et date d'arrivée sur Fifty, pour les seuls pseudos classés (inscrits à la saison).
// « Membre depuis » = premier instantané mensuel ou première génération journalisée, le plus ancien.
export async function getProfileCards(usernames: string[]): Promise<Record<string, ProfileCardData>> {
  const wanted = Array.from(new Set(usernames.map(normalizeUsername))).filter(Boolean);
  if (!wanted.length) return {};
  try {
    const pool = getPool();
    const [badges, since] = await Promise.all([
      pool.query<Omit<Badge, "id" | "created_at"> & { id: string; created_at: Date; username: string }>(
        "SELECT id, username, type, label, category, rank, month, created_at, description, pinned FROM badge WHERE username = ANY($1)",
        [wanted],
      ),
      pool.query<{ username: string; since: Date }>(
        `SELECT username, min(at) AS since FROM (
           SELECT username, first_seen_at AS at FROM monthly_snapshot WHERE username = ANY($1)
           UNION ALL
           SELECT username, generated_at FROM generation_log WHERE username = ANY($1)
         ) AS arrivals GROUP BY username`,
        [wanted],
      ),
    ]);
    const cards: Record<string, ProfileCardData> = {};
    for (const username of wanted) {
      const own = badges.rows
        .filter((row) => row.username === username)
        .map(({ username: _owner, ...row }) => ({ ...row, id: Number(row.id), created_at: row.created_at.toISOString() }));
      const arrival = since.rows.find((row) => row.username === username)?.since;
      cards[username] = { since: arrival ? arrival.toISOString() : null, badges: selectDisplayBadges(own) };
    }
    return cards;
  } catch (error) {
    // Confort, jamais bloquant : sans encadré, la bulle garde son lien direct vers Letterboxd.
    console.error("[hall-of-fame] encadrés indisponibles :", error instanceof Error ? error.message : error);
    return {};
  }
}
