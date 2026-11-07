// Mesure anonyme des clics (08/11/2026), côté navigateur. Voir app/api/click/route.ts.
export const TRACK_MODULES = ["recos", "carrousel", "constellation", "passeport", "fixettes", "liste", "hall", "jeu", "profil", "autre"] as const;
export const TRACK_KINDS = ["vue", "retournee", "film", "profil", "personne", "autre"] as const;
export type TrackModule = (typeof TRACK_MODULES)[number];
export type TrackKind = (typeof TRACK_KINDS)[number];

/** Slug Letterboxd d'une adresse de film, "" sinon. */
export function filmSlug(href: string | null | undefined): string {
  return /letterboxd\.com\/film\/([a-z0-9-]+)/.exec(href ?? "")?.[1] ?? "";
}

/** Type de lien Letterboxd : film, fiche d'une personne (cinéaste, interprète) ou profil d'un membre. */
export function linkKind(href: string): TrackKind {
  if (filmSlug(href)) return "film";
  if (/letterboxd\.com\/(director|actor|actress|writer|producer)\//.test(href)) return "personne";
  if (/letterboxd\.com\/[A-Za-z0-9_]+\/?$/.test(href)) return "profil";
  return "autre";
}

export function track(area: TrackModule, kind: TrackKind, film = "", slot = "") {
  try {
    const body = JSON.stringify({ m: area, k: kind, s: slot, f: film });
    // sendBeacon survit à l'ouverture d'un nouvel onglet ; fetch keepalive en repli.
    if (!navigator.sendBeacon?.("/api/click", body)) {
      void fetch("/api/click", { method: "POST", body, keepalive: true });
    }
  } catch {
    // Mesure best effort : jamais d'erreur visible.
  }
}
