// Pur (sans base) : utilisable côté navigateur. Voir lib/profileColor.ts pour l'attribution.
export type AvatarColor = "orange" | "blue" | "green" | "tricolor";

/** Classe CSS de la bulle d'un profil ; sans couleur connue, la bulle garde son style par défaut. */
export function avatarColorClass(color: AvatarColor | null | undefined) {
  return color ? ` avatarColor-${color}` : "";
}
