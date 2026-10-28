// Serveur uniquement. Fiftyguess, le jeu de la semaine (lot 11, décisions du 28/10/2026).
// Le chrono est tenu ici (started_at en base) : le navigateur ne fait que l'afficher.
import { getPool } from "./db";

export const REVEAL_SECONDS = 50;
export const CAP_SECONDS = 120; // partie arrêtée à 2:00 ; abandon = 2:00
const PENALTIES = [1, 3, 5]; // +1 s, +3 s, puis +5 s à chaque erreur

export type Mode = "compet" | "zen";

export type Round = {
  id: number;
  kind: "week" | "bonus";
  opens_on: string;
  closes_on: string;
  month: string;
  title_fr: string;
  title_orig: string;
  aliases: string[];
  year: number | null;
  director: string | null;
  letterboxd_slug: string | null;
  poster_url: string;
  focus_x: number;
  focus_y: number;
};

export type Play = {
  mode: Mode;
  started_at: Date;
  finished_at: Date | null;
  wrong: number;
  penalty: number;
  outcome: "found" | "giveup" | "time" | null;
  score: number | null;
};

/** Date du jour à Paris, au format AAAA-MM-JJ : les semaines commencent le lundi, heure française. */
export function parisToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
}

const ROUND_COLUMNS = `id, kind, to_char(opens_on, 'YYYY-MM-DD') AS opens_on, to_char(closes_on, 'YYYY-MM-DD') AS closes_on,
  month, title_fr, title_orig, aliases, year, director, letterboxd_slug, poster_url, focus_x, focus_y`;

/** Affiche de la semaine et bonus éventuel ouverts aujourd'hui (validés seulement). */
export async function openRounds(today = parisToday()): Promise<Round[]> {
  const result = await getPool().query<Round>(
    // Seuls les films validés dans les coulisses s'ouvrent aux joueurs.
    `SELECT ${ROUND_COLUMNS} FROM game_round WHERE status = 'validated' AND opens_on <= $1 AND closes_on >= $1 ORDER BY kind DESC`,
    [today],
  );
  return result.rows.map((row) => ({ ...row, id: Number(row.id) }));
}

export async function getRound(id: number): Promise<Round | null> {
  const result = await getPool().query<Round>(`SELECT ${ROUND_COLUMNS} FROM game_round WHERE id = $1`, [id]);
  return result.rows[0] ? { ...result.rows[0], id: Number(result.rows[0].id) } : null;
}

export async function getPlay(roundId: number, username: string): Promise<Play | null> {
  const result = await getPool().query<Play>(
    "SELECT mode, started_at, finished_at, wrong, penalty, outcome, score FROM game_play WHERE round_id = $1 AND username = $2",
    [roundId, username],
  );
  return result.rows[0] ?? null;
}

/** Le bonus du mois s'ouvre à qui a joué toutes les affiches de la semaine du mois (compétitif ou zen). */
export async function bonusUnlocked(month: string, username: string): Promise<boolean> {
  const result = await getPool().query<{ missing: string }>(
    `SELECT count(*) AS missing FROM game_round r
     WHERE r.kind = 'week' AND r.month = $1
       AND NOT EXISTS (SELECT 1 FROM game_play p WHERE p.round_id = r.id AND p.username = $2 AND p.outcome IS NOT NULL)`,
    [month, username],
  );
  return Number(result.rows[0]?.missing ?? 1) === 0;
}

export function elapsedSeconds(play: Play, now = new Date()): number {
  return (now.getTime() - new Date(play.started_at).getTime()) / 1000;
}

export function nextPenalty(wrong: number): number {
  return PENALTIES[Math.min(wrong, PENALTIES.length - 1)];
}

// ---------- Réponses : tolérance silencieuse ----------
const ARTICLES = new Set(["the", "a", "an", "le", "la", "les", "l", "un", "une"]);

function normalize(text: string): string {
  const words = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ");
  while (words.length > 1 && ARTICLES.has(words[0])) words.shift();
  return words.join(" ");
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const kept = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = kept;
    }
  }
  return row[b.length];
}

/** Titre français, original ou alias ; sans accents, majuscules ni article ; 1 à 3 fautes selon la
 * longueur. Les numéros doivent être exacts (« Toy Story 2 » n'est pas « Toy Story 3 »). */
export function isRightAnswer(guess: string, round: Pick<Round, "title_fr" | "title_orig" | "aliases">): boolean {
  const g = normalize(guess);
  if (!g) return false;
  const digits = (text: string) => (text.match(/\d+/g) ?? []).join(",");
  return [round.title_fr, round.title_orig, ...round.aliases].some((title) => {
    const t = normalize(title);
    if (g === t) return true;
    if (digits(g) !== digits(t)) return false;
    const allowed = t.length <= 4 ? 0 : t.length <= 8 ? 1 : t.length <= 15 ? 2 : 3;
    return levenshtein(g, t) <= allowed;
  });
}

/** Classement de la semaine : parties compétitives terminées, du plus rapide au plus lent. */
export async function leaderboard(roundId: number, limit = 10) {
  const result = await getPool().query<{ username: string; score: number; outcome: string }>(
    `SELECT coalesce(c.display_username, p.username) AS username, p.score, p.outcome FROM game_play p
     LEFT JOIN profile_cache c ON c.username = p.username
     WHERE p.round_id = $1 AND p.mode = 'compet' AND p.outcome IS NOT NULL
     ORDER BY p.score ASC, p.finished_at ASC LIMIT $2`,
    [roundId, limit],
  );
  return result.rows;
}
