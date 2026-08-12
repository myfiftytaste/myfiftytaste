import { promises as fs } from "fs";
import path from "path";
import { CONTINENTS, type Continent, type ContinentFilmRef, type ContinentWinner } from "./hallOfFameTypes";

export { CONTINENTS, type Continent, type ContinentFilmRef, type ContinentWinner } from "./hallOfFameTypes";

// Mirrors scripts/hall_of_fame_common.py + scripts/build_monthly_snapshot.py.
// Rankings are recomputed on every page load straight from the frozen
// snapshots on disk (cheap: at most a few hundred small JSON files), rather
// than cached — see the Hall of Fame brief, section 3.2: no scheduler needed
// for launch.

const HOF_DIR = path.join(process.cwd(), "..", "data", "output", "hall_of_fame");

export type MetricsSnapshot = {
  detected_films_count: number | null;
  mainstream_pct: number | null;
  niche_pct: number | null;
  review_count: number | null;
  average_release_year: number | null;
  current_year_release_pct: number | null;
  current_year_release_count: number | null;
};

export type MonthlySnapshot = {
  month: string;
  username: string;
  first_seen_at: string;
  opted_in: boolean | null;
  opted_in_at: string | null;
  metrics_snapshot: MetricsSnapshot;
  continent_consumption: Record<string, number>;
  continent_films?: Record<string, ContinentFilmRef[]>;
};

export type PodiumEntry = {
  rank: 1 | 2 | 3;
  username: string;
  metricLabel: string;
};

export type PodiumCategory = {
  key: string;
  title: string;
  sub: string;
  entries: PodiumEntry[];
};

export function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function nextMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(date);
}

export function monthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1, 1));
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

// "Saison de <month>", with the "de" -> "d'" elision French requires before
// a month starting with a vowel sound (avril, août, octobre).
export function seasonTitle(month: string): string {
  const label = monthLabel(month);
  return /^[aeiouyàâéèêëîïôùûü]/i.test(label) ? `d’${label}` : `de ${label}`;
}

async function readSnapshotsForMonth(month: string): Promise<MonthlySnapshot[]> {
  const monthDir = path.join(HOF_DIR, month);
  let files: string[];
  try {
    files = await fs.readdir(monthDir);
  } catch {
    return [];
  }

  const snapshots = await Promise.all(
    files
      .filter((file) => file.endsWith("_snapshot.json"))
      .map(async (file) => {
        try {
          const raw = await fs.readFile(path.join(monthDir, file), "utf-8");
          return JSON.parse(raw) as MonthlySnapshot;
        } catch {
          return null;
        }
      }),
  );

  return snapshots.filter((snapshot): snapshot is MonthlySnapshot => snapshot !== null);
}

function ranked(
  snapshots: MonthlySnapshot[],
  valueOf: (snapshot: MonthlySnapshot) => number | null,
  direction: "desc" | "asc",
  formatMetric: (value: number) => string,
): PodiumEntry[] {
  const withValues = snapshots
    .map((snapshot) => ({ snapshot, value: valueOf(snapshot) }))
    .filter((item): item is { snapshot: MonthlySnapshot; value: number } => item.value !== null);

  withValues.sort((a, b) => {
    const delta = direction === "desc" ? b.value - a.value : a.value - b.value;
    if (delta !== 0) return delta;
    // Deterministic tiebreak: whoever froze their snapshot first this month.
    return a.snapshot.first_seen_at.localeCompare(b.snapshot.first_seen_at);
  });

  return withValues.slice(0, 3).map((item, index) => ({
    rank: (index + 1) as 1 | 2 | 3,
    username: item.snapshot.username,
    metricLabel: formatMetric(item.value),
  }));
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function continentWinners(snapshots: MonthlySnapshot[]): Partial<Record<Continent, ContinentWinner>> {
  const winners: Partial<Record<Continent, ContinentWinner>> = {};

  for (const continent of CONTINENTS) {
    let best: { snapshot: MonthlySnapshot; value: number } | null = null;
    for (const snapshot of snapshots) {
      const value = snapshot.continent_consumption?.[continent] ?? 0;
      if (value <= 0) continue;
      if (
        !best ||
        value > best.value ||
        (value === best.value && snapshot.first_seen_at.localeCompare(best.snapshot.first_seen_at) < 0)
      ) {
        best = { snapshot, value };
      }
    }
    // A continent nobody watched a film from this month gets no winner —
    // never an invented/default attribution (brief section 26).
    if (best) {
      winners[continent] = {
        username: best.snapshot.username,
        filmCount: best.value,
        films: (best.snapshot.continent_films?.[continent] ?? []).slice(0, 4),
      };
    }
  }

  return winners;
}

export type MonthlyRankings = {
  month: string;
  participantCount: number;
  podiums: PodiumCategory[];
  continentWinners: Partial<Record<Continent, ContinentWinner>>;
};

export async function getMonthlyRankings(month: string): Promise<MonthlyRankings> {
  const snapshots = await readSnapshotsForMonth(month);
  const optedIn = snapshots.filter((snapshot) => snapshot.opted_in === true);
  const currentYear = Number(month.split("-")[0]);

  const podiums: PodiumCategory[] = [
    {
      key: "mainstream",
      title: "Top Mainstream",
      sub: "A consommé le plus de blockbusters et succès populaires",
      entries: ranked(optedIn, (s) => s.metrics_snapshot.mainstream_pct, "desc", (v) => `${formatPercent(v)} mainstream`),
    },
    {
      key: "niche",
      title: "Top Niche",
      sub: "A creusé le plus loin dans les films niche",
      entries: ranked(optedIn, (s) => s.metrics_snapshot.niche_pct, "desc", (v) => `${formatPercent(v)} niche`),
    },
    {
      key: "critique",
      title: "Top Critique",
      sub: "A le plus commenté ses visionnages",
      entries: ranked(optedIn, (s) => s.metrics_snapshot.review_count, "desc", (v) => `${Math.round(v)} reviews`),
    },
    {
      key: "fantome",
      title: "Top Fantôme",
      sub: "N'a laissé aucune trace écrite",
      entries: ranked(optedIn, (s) => s.metrics_snapshot.review_count, "asc", (v) => `${Math.round(v)} reviews`),
    },
    {
      key: "nostalgique",
      title: "Top Nostalgique",
      sub: "Le plus tourné vers le cinéma d'hier",
      entries: ranked(optedIn, (s) => s.metrics_snapshot.average_release_year, "asc", (v) => `${Math.round(v)} année moy.`),
    },
    {
      key: "sorties_annee",
      title: "Top Sorties de l'année",
      sub: "Le plus à jour sur les sorties de l'année",
      entries: ranked(
        optedIn,
        (s) => s.metrics_snapshot.current_year_release_pct,
        "desc",
        (v) => `${formatPercent(v)} de films sortis en ${currentYear}`,
      ),
    },
  ];

  return { month, participantCount: optedIn.length, podiums, continentWinners: continentWinners(optedIn) };
}
