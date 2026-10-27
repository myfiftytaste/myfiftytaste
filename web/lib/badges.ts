import { getPool, normalizeUsername } from "./db";
import type { Badge } from "./badgeSelection";

export type { Badge } from "./badgeSelection";
export { selectDisplayBadges, type DisplayBadges } from "./badgeSelection";

// Server-only (reads Postgres via lib/db) — only import this from Server
// Components/route handlers, never from a "use client" file. Client-side
// code that just needs to render badges should import from
// lib/badgeSelection instead.

export async function getBadgesForUser(username: string): Promise<Badge[]> {
  const pool = getPool();
  const result = await pool.query<{
    id: string;
    type: "earned" | "manual";
    label: string;
    category: string;
    rank: number | null;
    month: string | null;
    created_at: Date;
    description: string | null;
    pinned: boolean;
  }>(
    "SELECT id, type, label, category, rank, month, created_at, description, pinned FROM badge WHERE username = $1",
    [normalizeUsername(username)],
  );
  // id est un bigint : pg le renvoie en texte.
  return result.rows.map((row) => ({ ...row, id: Number(row.id), created_at: row.created_at.toISOString() }));
}
