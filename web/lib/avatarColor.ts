// Pur (sans base) : utilisable côté navigateur. Voir lib/profileColor.ts pour l'attribution.
export type AvatarColor = "orange" | "blue" | "green" | "tricolor";

/** Classe CSS de la bulle d'un profil ; sans couleur connue, la bulle garde son style par défaut. */
export function avatarColorClass(color: AvatarColor | null | undefined) {
  return color ? ` avatarColor-${color}` : "";
}

/** Initiale affichée dans une bulle de profil. */
export function initials(name: string): string {
  const cleaned = name.replace(/[._-]/g, " ").trim();
  return (cleaned[0] ?? "?").toUpperCase();
}
