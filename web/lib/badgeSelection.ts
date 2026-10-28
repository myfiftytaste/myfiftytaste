// Pure helpers only (no fs) — safe to import from client components. See
// lib/badges.ts for the server-only file read.

// Mirrors scripts/attribute_badges.py's output shape. "manual" vs "earned"
// is an internal sorting/filtering distinction only — never shown or
// explained in the UI (Hall of Fame brief, section 6).
export type Badge = {
  id: number;
  type: "earned" | "manual";
  label: string;
  category: string;
  rank: number | null;
  month: string | null;
  created_at: string;
  // Facultative (migrations/004) : affichée au survol/tap, jamais générée
  // automatiquement — NULL pour la plupart des badges gagnés.
  description: string | null;
  // Choisi dans « Mes badges » (migrations/007). Au moins un choisi : seuls les choisis s'affichent.
  pinned: boolean;
};

export const MAX_PINNED = 3;

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
  // Choix fait dans « Mes badges » : il prime sur la règle automatique ci-dessous.
  const pinned = badges.filter((badge) => badge.pinned).sort(byRankThenRecent).slice(0, MAX_PINNED);
  if (pinned.length) {
    const manual = pinned.find((badge) => badge.type === "manual") ?? null;
    const earned = pinned.filter((badge) => badge !== manual);
    return { manual, earned, overflowCount: Math.max(0, badges.length - pinned.length) };
  }

  const manualBadges = badges
    .filter((badge) => badge.type === "manual")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const earnedBadges = badges
    .filter((badge) => badge.type === "earned")
    .sort(byRankThenRecent);

  const manual = manualBadges[0] ?? null;
  const earned = earnedBadges.slice(0, 2);
  const shown = (manual ? 1 : 0) + earned.length;

  return { manual, earned, overflowCount: Math.max(0, badges.length - shown) };
}

// Meilleur rang d'abord (badge manuel = sans rang, en dernier), puis le plus récent.
function byRankThenRecent(a: Badge, b: Badge) {
  const rankDelta = (a.rank ?? 99) - (b.rank ?? 99);
  if (rankDelta !== 0) return rankDelta;
  return b.created_at.localeCompare(a.created_at);
}
