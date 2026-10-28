import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import {
  bonusUnlocked,
  CAP_SECONDS,
  elapsedSeconds,
  getPlay,
  getRound,
  isRightAnswer,
  leaderboard,
  nextPenalty,
  openRounds,
  REVEAL_SECONDS,
  type Mode,
  type Play,
  type Round,
} from "../../../lib/fiftyguess";
import { OWNER_COOKIE, verifyOwner } from "../../../lib/ownerCookie";

// Fiftyguess (lot 11). GET : affiches ouvertes, partie en cours, classement de la semaine.
// POST { action: "start" | "guess" | "giveup", roundId, ... } : le chrono et la réponse restent
// côté serveur ; l'affiche n'est envoyée qu'une fois la partie lancée.
// Identité : le cookie signé fifty_owner (le même que pour le Hall of Fame), pour que personne
// ne joue sous le pseudo d'un autre.
export const dynamic = "force-dynamic";

function me(request: NextRequest) {
  return verifyOwner(request.cookies.get(OWNER_COOKIE)?.value);
}

/** Ce que le navigateur a le droit de savoir d'une affiche, selon l'état de la partie. */
function publicRound(round: Round, play: Play | null, locked: boolean) {
  const finished = Boolean(play?.outcome);
  return {
    id: round.id,
    kind: round.kind,
    opens_on: round.opens_on,
    closes_on: round.closes_on,
    month: round.month,
    locked,
    play: play
      ? {
          mode: play.mode,
          elapsed: finished ? null : elapsedSeconds(play),
          wrong: play.wrong,
          penalty: play.penalty,
          outcome: play.outcome,
          score: play.score,
        }
      : null,
    // L'affiche seulement une fois la partie lancée, la réponse seulement une fois terminée.
    poster: play ? { url: round.poster_url, focus_x: round.focus_x, focus_y: round.focus_y } : null,
    answer: finished
      ? { title_fr: round.title_fr, title_orig: round.title_orig, year: round.year, director: round.director, slug: round.letterboxd_slug }
      : null,
  };
}

async function finish(roundId: number, username: string, outcome: "found" | "giveup" | "time", score: number | null) {
  await getPool().query(
    "UPDATE game_play SET outcome = $3, score = $4, finished_at = now() WHERE round_id = $1 AND username = $2 AND outcome IS NULL",
    [roundId, username, outcome, score],
  );
}

export async function GET(request: NextRequest) {
  const username = me(request);
  const rounds = await openRounds();
  const payload = await Promise.all(
    rounds.map(async (round) => {
      const play = username ? await getPlay(round.id, username) : null;
      const locked = round.kind === "bonus" && !(username && (play || (await bonusUnlocked(round.month, username))));
      return { ...publicRound(round, play, locked), leaderboard: round.kind === "week" ? await leaderboard(round.id) : [] };
    }),
  );
  return NextResponse.json({ username, rounds: payload, reveal: REVEAL_SECONDS, cap: CAP_SECONDS });
}

export async function POST(request: NextRequest) {
  const username = me(request);
  if (!username) {
    return NextResponse.json({ error: "Lance d'abord ton wrapped depuis ce navigateur pour jouer." }, { status: 403 });
  }
  let body: { action?: string; roundId?: number; mode?: string; guess?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const round = Number.isSafeInteger(body.roundId) ? await getRound(body.roundId as number) : null;
  if (!round || !(await openRounds()).some((open) => open.id === round.id)) {
    return NextResponse.json({ error: "Cette affiche n'est pas ouverte." }, { status: 404 });
  }

  if (body.action === "start") {
    const mode: Mode = body.mode === "zen" ? "zen" : "compet";
    if (round.kind === "bonus" && !(await bonusUnlocked(round.month, username))) {
      return NextResponse.json({ error: "Le bonus s'ouvre quand tu as joué toutes les semaines du mois." }, { status: 403 });
    }
    // Une seule partie par affiche : relancer reprend la même, chrono compris.
    await getPool().query(
      "INSERT INTO game_play (round_id, username, mode) VALUES ($1, $2, $3) ON CONFLICT (round_id, username) DO NOTHING",
      [round.id, username, mode],
    );
    return NextResponse.json(publicRound(round, await getPlay(round.id, username), false));
  }

  const play = await getPlay(round.id, username);
  if (!play) return NextResponse.json({ error: "Partie non lancée." }, { status: 409 });
  if (play.outcome) return NextResponse.json(publicRound(round, play, false));
  const compet = play.mode === "compet";
  const now = elapsedSeconds(play);

  if (body.action === "giveup" || (compet && now + play.penalty >= CAP_SECONDS)) {
    await finish(round.id, username, body.action === "giveup" ? "giveup" : "time", compet ? CAP_SECONDS : null);
  } else if (body.action === "tick") {
    // Le navigateur demande juste où en est la partie (fin des 2 minutes gérée juste au-dessus).
  } else if (body.action === "guess" && typeof body.guess === "string" && body.guess.length <= 200) {
    if (isRightAnswer(body.guess, round)) {
      await finish(round.id, username, "found", compet ? Math.min(CAP_SECONDS, now + play.penalty) : null);
    } else {
      const added = compet ? nextPenalty(play.wrong) : 0;
      await getPool().query(
        "UPDATE game_play SET wrong = wrong + 1, penalty = penalty + $3 WHERE round_id = $1 AND username = $2 AND outcome IS NULL",
        [round.id, username, added],
      );
      if (compet && now + play.penalty + added >= CAP_SECONDS) await finish(round.id, username, "time", CAP_SECONDS);
      const updated = await getPlay(round.id, username);
      return NextResponse.json({ ...publicRound(round, updated, false), wrongGuess: true, added });
    }
  } else {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }
  return NextResponse.json(publicRound(round, await getPlay(round.id, username), false));
}
