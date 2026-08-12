// Pure helpers only (no fs) — safe to import from client components. See
// lib/badges.ts for the server-only file read.

// Mirrors scripts/attribute_badges.py's output shape. "manual" vs "earned"
// is an internal sorting/filtering distinction only — never shown or
// explained in the UI (Hall of Fame brief, section 6).
export type Badge = {
  type: "earned" | "manual";
  label: string;
  category: string;
  rank: number | null;
  month: string | null;
  created_at: string;
};

export type DisplayBadges = {
  manual: Badge | null;
  earned: Badge[];
  overflowCount: number;
};

// Slot rule (brief section 5): 3 slots max, but not interchangeable.
// - 1 slot reserved for a manual badge, only if one exists — never backfilled
//   with an earned badge.
// - Up to 2 slots for earned badges, whenever there are enough: best rank
//   first, most recent as the tiebreak.
// Everything else that doesn't fit collapses into a "+N" count.
export function selectDisplayBadges(badges: Badge[]): DisplayBadges {
  const manualBadges = badges
    .filter((badge) => badge.type === "manual")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const earnedBadges = badges
    .filter((badge) => badge.type === "earned")
    .sort((a, b) => {
      const rankDelta = (a.rank ?? 99) - (b.rank ?? 99);
      if (rankDelta !== 0) return rankDelta;
      return b.created_at.localeCompare(a.created_at);
    });

  const manual = manualBadges[0] ?? null;
  const earned = earnedBadges.slice(0, 2);
  const shown = (manual ? 1 : 0) + earned.length;

  return { manual, earned, overflowCount: Math.max(0, badges.length - shown) };
}
