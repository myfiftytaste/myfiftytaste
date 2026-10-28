// Ambiances de couleurs (chantier design du 27/10/2026). Pures : utilisables côté navigateur.
export const AMBIANCE_COOKIE = "fifty_ambiance";

// Préférences verrouillées pour l'instant (décision du 27/10/2026) : tout le monde est en
// Nuit américaine. Passer à true rouvre la page Préférences, la ligne de Divers, le cookie
// et sa ligne dans Confidentialité. Les deux autres ambiances restent prêtes dans globals.css.
export const AMBIANCES_OPEN = false;

export const AMBIANCES = [
  { id: "nuit", film: "La Nuit américaine", credit: "François Truffaut, 1973", colors: ["#0f1a2b", "#f0a43a", "#6ec6d9"] },
  { id: "mood", film: "In the Mood for Love", credit: "Wong Kar-wai, 2000", colors: ["#170d12", "#c9a86a", "#d0404f"] },
  { id: "amelie", film: "Amélie", credit: "Jean-Pierre Jeunet, 2001", colors: ["#0f1a14", "#e0533a", "#e6c04a"] },
] as const;

export type AmbianceId = (typeof AMBIANCES)[number]["id"];
export const DEFAULT_AMBIANCE: AmbianceId = "nuit";

export function readAmbiance(): AmbianceId {
  const match = document.cookie.match(new RegExp(`(?:^|; )${AMBIANCE_COOKIE}=(nuit|mood|amelie)`));
  return (match?.[1] as AmbianceId) ?? DEFAULT_AMBIANCE;
}

/** Applique l'ambiance tout de suite (sans recharger) et la retient un an sur cet appareil. */
export function applyAmbiance(id: AmbianceId) {
  document.documentElement.dataset.ambiance = id;
  document.cookie = `${AMBIANCE_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax; secure`;
}

// Lu avant le premier affichage (script dans layout.tsx) : pas de flash de l'ambiance par défaut.
export const AMBIANCE_BOOT_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )${AMBIANCE_COOKIE}=(nuit|mood|amelie)/);if(m)document.documentElement.dataset.ambiance=m[1]}catch(e){}`;
