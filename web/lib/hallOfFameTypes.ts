// Pure types/constants only (no fs) — safe to import from client components
// like ContinentMap. See lib/hallOfFame.ts for the server-only file reads
// and ranking computation.

import type { AvatarColor } from "./avatarColor";

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
