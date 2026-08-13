// Pure helpers only (no fs/pg) — safe to import from client components, e.g.
// app/page.tsx for instant validation before ever calling POST /api/profile.
// See lib/db.ts for the server-only pieces (pool, rate limit) that re-export
// these instead of redeclaring them.

// Règle officielle Letterboxd (api-docs.letterboxd.com, propriété
// `username` de l'objet Member) : "Usernames must be between 2 and 15
// characters long and may only contain upper or lowercase letters, numbers
// or the underscore (_) character." Ni tiret ni point — vérifié aussi en
// direct sur le formulaire d'inscription ("Use a-z, 0-9 or _ only") et par
// des essais RSS réels. Les pseudos à point de la maquette Hall of Fame
// (juliette.reel, noe.cinephile) étaient décoratifs, pas de vrais comptes —
// à ne jamais reprendre comme référence technique.
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{2,15}$/;

/** Normalise un pseudo comme le reste du système : trim, @ initial retiré, minuscules. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}
