import { getPool, normalizeUsername } from "./db";
import type { AvatarColor } from "./avatarColor";

// Serveur uniquement. Couleur de bulle de chaque profil (migrations/008) : orange → bleu → vert, dans
// l'ordre strict d'arrivée des profils. Un profil sans couleur en reçoit une à sa première lecture.
const CYCLE: AvatarColor[] = ["orange", "blue", "green"];

export async function getProfileColors(usernames: string[]): Promise<Record<string, AvatarColor>> {
  const wanted = Array.from(new Set(usernames.map(normalizeUsername)));
  if (!wanted.length) return {};
  const pool = getPool();
  const read = async () =>
    (await pool.query<{ username: string; color: AvatarColor }>(
      "SELECT username, color FROM profile_color WHERE username = ANY($1)",
      [wanted],
    )).rows;

  let rows = await read();
  const missing = wanted.filter((username) => !rows.some((row) => row.username === username));
  if (missing.length) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Verrou court : deux nouveaux profils en même temps ne peuvent pas prendre la même couleur.
      await client.query("LOCK TABLE profile_color IN SHARE ROW EXCLUSIVE MODE");
      const last = await client.query<{ color: AvatarColor; pos: number }>(
        "SELECT color, pos FROM profile_color WHERE pos IS NOT NULL ORDER BY pos DESC LIMIT 1",
      );
      let pos = last.rows[0]?.pos ?? 0;
      let index = last.rows[0] ? CYCLE.indexOf(last.rows[0].color) : -1;
      for (const username of missing) {
        const inserted = await client.query(
          "INSERT INTO profile_color (username, color, pos) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING",
          [username, CYCLE[(index + 1) % CYCLE.length], pos + 1],
        );
        if (inserted.rowCount) {
          pos += 1;
          index = (index + 1) % CYCLE.length;
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    rows = await read();
  }
  return Object.fromEntries(rows.map((row) => [row.username, row.color]));
}

export async function getProfileColor(username: string): Promise<AvatarColor | null> {
  return (await safeProfileColors([username]))[normalizeUsername(username)] ?? null;
}

/** Comme getProfileColors, mais n'échoue jamais : une bulle sans couleur vaut mieux qu'une page en erreur. */
export async function safeProfileColors(usernames: string[]): Promise<Record<string, AvatarColor>> {
  return getProfileColors(usernames).catch(() => ({}));
}
