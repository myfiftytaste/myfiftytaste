import { NextRequest, NextResponse } from "next/server";
import { getPool, normalizeUsername, USERNAME_PATTERN } from "../../../../../lib/db";

// GET /api/profile/{pseudo}/films — les 50 films du dernier calcul, pour l'onglet « Ma liste » (lot 14).
// Route à part : la page profil n'a pas besoin de ce poids-là.
export async function GET(_request: NextRequest, { params }: { params: { username: string } }) {
  let decoded: string;
  try {
    decoded = decodeURIComponent(params.username);
  } catch {
    return NextResponse.json({ error: "Pseudo invalide." }, { status: 400 });
  }
  const username = normalizeUsername(decoded);
  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json({ error: "Pseudo invalide." }, { status: 400 });
  }
  const result = await getPool().query<{ display_username: string | null; films: unknown; generated_at: Date }>(
    "SELECT display_username, films, generated_at FROM profile_cache WHERE username = $1",
    [username],
  );
  const row = result.rows[0];
  if (!row) {
    return NextResponse.json({ error: "Profil jamais généré." }, { status: 404 });
  }
  return NextResponse.json({
    username: row.display_username ?? username,
    films: Array.isArray(row.films) ? row.films : [],
    generated_at: row.generated_at,
  });
}
