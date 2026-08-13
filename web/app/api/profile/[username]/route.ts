import { NextRequest, NextResponse } from "next/server";
import { getBadgesForUser } from "../../../../lib/badges";
import { getPool, normalizeUsername, USERNAME_PATTERN } from "../../../../lib/db";

// GET /api/profile/{username} — architecture-v1-dynamique.md section 3.
//   → 200 profil depuis le cache, ou 404 si jamais généré
//
// C'est cette route qui permet la navigation sociale du Hall of Fame
// (cliquer un pseudo mène au profil sans repasser par la saisie) et le
// partage d'URL — c'est aussi elle qui alimente `badges` (Hall of Fame
// bloc C), pas de nouvelle route dédiée : le contrat existant s'enrichit
// d'un champ plutôt que d'ajouter un aller-retour réseau de plus.

export async function GET(_request: NextRequest, { params }: { params: { username: string } }) {
  const username = normalizeUsername(decodeURIComponent(params.username));

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json({ error: "Pseudo invalide." }, { status: 400 });
  }

  const pool = getPool();
  const result = await pool.query<{
    display_username: string | null;
    display_profile: unknown;
    metrics: unknown;
    recommendations: unknown;
    generated_at: Date;
  }>(
    "SELECT display_username, display_profile, metrics, recommendations, generated_at FROM profile_cache WHERE username = $1",
    [username],
  );

  const row = result.rows[0];
  if (!row) {
    return NextResponse.json({ error: "Profil jamais généré." }, { status: 404 });
  }

  const badges = await getBadgesForUser(username);

  // display_profile / recommendations renvoyés tels quels, sans transformation.
  return NextResponse.json({
    username: row.display_username ?? username,
    display_profile: row.display_profile,
    metrics: row.metrics,
    recommendations: row.recommendations,
    generated_at: row.generated_at,
    badges,
  });
}
