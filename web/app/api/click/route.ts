import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import { TRACK_KINDS, TRACK_MODULES } from "../../../lib/track";

// Compteur anonyme des clics vers Letterboxd (migration 011, 08/11/2026) : on n'enregistre que
// module, type, place de la reco et slug du film, agrégés par jour. Ni pseudo, ni IP, ni cookie.
// Répond toujours 204 : une mesure ratée ne doit jamais gêner la navigation (ni planter si la
// migration 011 n'est pas encore passée).
// shortcut: pas de limite de débit ; un abus ne ferait que gonfler des compteurs sans données personnelles.
export async function POST(request: NextRequest) {
  try {
    const body = JSON.parse(await request.text()) as Record<string, unknown>;
    const area = String(body.m ?? "");
    const kind = String(body.k ?? "");
    const slot = String(body.s ?? "");
    const film = String(body.f ?? "");
    if (
      (TRACK_MODULES as readonly string[]).includes(area) &&
      (TRACK_KINDS as readonly string[]).includes(kind) &&
      /^[a-z_]{0,20}$/.test(slot) &&
      /^[a-z0-9-]{0,120}$/.test(film)
    ) {
      await getPool().query(
        `INSERT INTO link_click (day, module, kind, slot, film, count)
         VALUES ((now() AT TIME ZONE 'Europe/Paris')::date, $1, $2, $3, $4, 1)
         ON CONFLICT (day, module, kind, slot, film) DO UPDATE SET count = link_click.count + 1`,
        [area, kind, slot, film],
      );
    }
  } catch (error) {
    console.error("[click]", error instanceof Error ? error.message : error);
  }
  return new NextResponse(null, { status: 204 });
}
