import { promises as fs } from "fs";
import path from "path";
import type { Badge } from "./badgeSelection";

export type { Badge } from "./badgeSelection";
export { selectDisplayBadges, type DisplayBadges } from "./badgeSelection";

// Server-only (reads the filesystem) — only import this from Server
// Components/route handlers, never from a "use client" file. Client-side
// code that just needs to render badges should import from
// lib/badgeSelection instead.
const BADGES_DIR = path.join(process.cwd(), "..", "data", "output", "hall_of_fame", "badges");

export async function getBadgesForUser(username: string): Promise<Badge[]> {
  try {
    const raw = await fs.readFile(path.join(BADGES_DIR, `${username}.json`), "utf-8");
    return JSON.parse(raw) as Badge[];
  } catch {
    return [];
  }
}
