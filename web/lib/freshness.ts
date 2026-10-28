// Pur (ni pg ni fs) : importé à la fois par les routes API (via lib/db.ts) et par la page profil.

// Règle "profil frais" volontairement simple et explicite : ajuster cette
// constante suffit à changer le comportement.
export const PROFILE_FRESHNESS_HOURS = 24;
// Livraison de la V3 (fusion dans main) : un profil calculé avant n'a ni les nouveaux modules ni les
// nouveaux textes, il est recalculé.
const V3_DELIVERED_AT = Date.parse("2026-10-28T18:20:00Z");

/** Frais = moins de 24 h ET généré pendant le mois UTC en cours : un profil du 31 à 22 h
 * ne doit pas empêcher d'en créer un nouveau le 1er, qui ouvre la saison du Hall of Fame. */
export function isFresh(generatedAt: Date, now = new Date()): boolean {
  const ageMs = now.getTime() - generatedAt.getTime();
  const sameUtcMonth =
    generatedAt.getUTCFullYear() === now.getUTCFullYear() && generatedAt.getUTCMonth() === now.getUTCMonth();
  return ageMs < PROFILE_FRESHNESS_HOURS * 60 * 60 * 1000 && sameUtcMonth && generatedAt.getTime() >= V3_DELIVERED_AT;
}
