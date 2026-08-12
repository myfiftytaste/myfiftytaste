// Pure types/constants only (no fs) — safe to import from client components
// like ContinentMap. See lib/hallOfFame.ts for the server-only file reads
// and ranking computation.

export const CONTINENTS = ["Europe", "Asie", "Afrique", "Amérique du Nord", "Amérique du Sud", "Océanie"] as const;
export type Continent = (typeof CONTINENTS)[number];

export type ContinentFilmRef = {
  title: string | null;
  year: number | null;
  slug: string | null;
};

export type ContinentWinner = {
  username: string;
  filmCount: number;
  films: ContinentFilmRef[];
};
