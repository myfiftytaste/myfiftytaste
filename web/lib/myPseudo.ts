// Pseudo saisi sur l'accueil, retenu pour l'onglet « Mon Wrapped » et le Hall of Fame.
// Cookie fonctionnel (aucun pistage), lisible côté serveur par la page Hall of Fame.
// Volontairement posé seulement depuis l'accueil : ouvrir le lien du profil d'un ami ne le remplace pas.
export const MY_PSEUDO_COOKIE = "fifty_pseudo";

export function rememberMyPseudo(username: string) {
  document.cookie = `${MY_PSEUDO_COOKIE}=${encodeURIComponent(username)}; path=/; max-age=31536000; samesite=lax`;
}

export function readMyPseudo(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${MY_PSEUDO_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
