// Pure types/constants only (no fs) — safe to import from client components
// like ContinentMap. See lib/hallOfFame.ts for the server-only file reads
// and ranking computation.

import type { AvatarColor } from "./avatarColor";
import type { DisplayBadges } from "./badgeSelection";

export const CONTINENTS = ["Europe", "Asie", "Afrique", "Amérique du Nord", "Amérique du Sud", "Océanie"] as const;
export type Continent = (typeof CONTINENTS)[number];

export type ContinentFilmRef = {
  title: string | null;
  year: number | null;
  slug: string | null;
};

export type ContinentWinner = {
  username: string;
  color?: AvatarColor;
  filmCount: number;
  films: ContinentFilmRef[];
};

// Encadré de profil des bulles (10/11/2026), rempli par lib/profileCards.ts.
export type ProfileCardData = {
  since: string | null;
  badges: DisplayBadges;
};
