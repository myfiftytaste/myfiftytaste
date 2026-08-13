import { NextRequest, NextResponse } from "next/server";
import { getPool, normalizeUsername, USERNAME_PATTERN } from "../../../../lib/db";

// GET/POST le statut d'opt-in Hall of Fame d'un profil pour un mois donné.
// Lit/écrit monthly_snapshot en base (Hall of Fame brief) — plus les
// fichiers data/output/hall_of_fame/<month>/<username>_snapshot.json
// d'origine, qui n'ont jamais existé sur le système de fichiers éphémère de
// Vercel. C'est cette route qui rendait le CTA de ProfileView invisible en
// production : `exists: false` faute de fichier trouvable, donc
// HallOfFameCTA restait en status "unavailable" (render null) en permanence.

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(request: NextRequest) {
  const usernameRaw = request.nextUrl.searchParams.get("username") ?? "";
  const month = request.nextUrl.searchParams.get("month") ?? "";
  const username = normalizeUsername(usernameRaw);

  if (!USERNAME_PATTERN.test(username) || !MONTH_PATTERN.test(month)) {
    return NextResponse.json({ error: "Invalid username or month." }, { status: 400 });
  }

  const pool = getPool();
  const result = await pool.query<{ opted_in: boolean | null }>(
    "SELECT opted_in FROM monthly_snapshot WHERE month = $1 AND username = $2",
    [month, username],
  );

  const row = result.rows[0];
  if (!row) {
    return NextResponse.json({ exists: false, optedIn: null });
  }

  return NextResponse.json({ exists: true, optedIn: row.opted_in });
}

export async function POST(request: NextRequest) {
  let body: { username?: string; month?: string; optedIn?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { month, optedIn } = body;
  const username = typeof body.username === "string" ? normalizeUsername(body.username) : "";
  if (!USERNAME_PATTERN.test(username) || typeof month !== "string" || !MONTH_PATTERN.test(month) || typeof optedIn !== "boolean") {
    return NextResponse.json({ error: "username, month and optedIn are required." }, { status: 400 });
  }

  const pool = getPool();
  // Le choix peut changer plus tard, mais s'applique toujours au même
  // metrics_snapshot figé — jamais un recalcul plus favorable : on ne
  // touche que opted_in/opted_in_at, jamais metrics_snapshot.
  const result = await pool.query<{ opted_in: boolean }>(
    `UPDATE monthly_snapshot
     SET opted_in = $3, opted_in_at = now()
     WHERE month = $1 AND username = $2
     RETURNING opted_in`,
    [month, username, optedIn],
  );

  const row = result.rows[0];
  if (!row) {
    return NextResponse.json({ error: "No frozen snapshot for this profile yet." }, { status: 404 });
  }

  return NextResponse.json({ exists: true, optedIn: row.opted_in });
}
