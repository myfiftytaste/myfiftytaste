import { NextRequest, NextResponse } from "next/server";
import { getPool, normalizeUsername, USERNAME_PATTERN } from "../../../../lib/db";
import { OWNER_COOKIE, verifyOwner } from "../../../../lib/ownerCookie";

// POST le choix d'opt-in Hall of Fame d'un profil pour un mois donné (monthly_snapshot).
// Il faut le cookie signé fifty_owner posé par POST /api/profile : sans lui, n'importe qui
// pourrait inscrire ou retirer le pseudo d'un autre (audit du 26/10/2026, #2). Pas de GET :
// le site ne lit plus le choix par cette route, et elle dévoilait celui de n'importe qui.

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

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

  if (verifyOwner(request.cookies.get(OWNER_COOKIE)?.value) !== username) {
    return NextResponse.json(
      { error: "Pour choisir, génère d'abord ton profil depuis ce navigateur." },
      { status: 403 },
    );
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
