import { NextRequest, NextResponse } from "next/server";
import { clientIp, getPool, isFresh, normalizeUsername, USERNAME_PATTERN, withinRateLimit } from "../../../lib/db";

// POST /api/profile — architecture-v1-dynamique.md section 3.
//
//   body   { username }
//   → 200  { job_id, cached: false }
//   → 200  { cached: true, profile }   -- cache frais, réponse immédiate
//
// Écart assumé par rapport au contrat écrit dans le document : la consigne
// donnée pour cette route dit explicitement de renvoyer le profil "sans
// créer de job" quand le cache est frais, alors que le document montre
// { job_id, cached: true, profile }. On suit la consigne (la plus récente et
// la plus explicite) : pas de job_id dans la réponse cache=true, puisque
// aucun job n'existe. À signaler/ajuster si ce n'était pas voulu.

export async function POST(request: NextRequest) {
  let body: { username?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  if (typeof body.username !== "string" || body.username.trim() === "") {
    return NextResponse.json({ error: "username est requis." }, { status: 400 });
  }

  const displayUsername = body.username.trim().replace(/^@+/, "");
  const username = normalizeUsername(body.username);

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      { error: "Le pseudo ne peut contenir que lettres, chiffres, _ et -." },
      { status: 400 },
    );
  }

  const pool = getPool();

  // 1. Profil frais en cache : réponse immédiate, aucun job créé.
  const cached = await pool.query<{ display_username: string | null; display_profile: unknown; metrics: unknown; recommendations: unknown; generated_at: Date }>(
    "SELECT display_username, display_profile, metrics, recommendations, generated_at FROM profile_cache WHERE username = $1",
    [username],
  );
  const cachedRow = cached.rows[0];
  if (cachedRow && isFresh(cachedRow.generated_at)) {
    return NextResponse.json({
      cached: true,
      profile: {
        username: cachedRow.display_username ?? username,
        display_profile: cachedRow.display_profile,
        metrics: cachedRow.metrics,
        recommendations: cachedRow.recommendations,
        generated_at: cachedRow.generated_at,
      },
    });
  }

  // 2. Pas de cache frais : avant de créer un job (l'opération coûteuse, pas
  // la lecture de cache ci-dessus), vérifier que cette IP n'en abuse pas.
  // Message volontairement rassurant : une IP peut être partagée par
  // plusieurs personnes (box, réseau d'entreprise), ce n'est pas forcément
  // la faute de qui la reçoit.
  if (!(await withinRateLimit(pool, clientIp(request)))) {
    return NextResponse.json(
      {
        error:
          "Beaucoup de monde génère un profil en ce moment depuis cette connexion. Patiente quelques minutes et réessaie — rien n'est perdu.",
      },
      { status: 429 },
    );
  }

  // 3. Réutiliser un job actif s'il en existe déjà un pour ce pseudo, sinon
  // en créer un. Une seule requête ferme la fenêtre de concurrence entre
  // deux requêtes simultanées : l'INSERT tente sa chance,
  // et s'il entre en conflit avec l'index unique partiel
  // (job_one_active_per_username_idx), ON CONFLICT DO NOTHING le laisse
  // passer sans erreur ni ligne créée — on relit alors le job existant.
  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO job (username, display_username, status)
     VALUES ($1, $2, 'queued')
     ON CONFLICT (username) WHERE status IN ('queued', 'running') DO NOTHING
     RETURNING id`,
    [username, displayUsername],
  );

  if (inserted.rows[0]) {
    return NextResponse.json({ job_id: inserted.rows[0].id, cached: false });
  }

  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM job WHERE username = $1 AND status IN ('queued', 'running')
     ORDER BY created_at DESC LIMIT 1`,
    [username],
  );

  if (!existing.rows[0]) {
    // Fenêtre théorique et extrêmement étroite : le job détecté en conflit a
    // fini (done/error) entre l'INSERT et ce SELECT. Le prochain appel de
    // cette route repartira proprement de l'étape 1 ou 2.
    return NextResponse.json(
      { error: "Le job vient de se terminer, réessaie." },
      { status: 409 },
    );
  }

  return NextResponse.json({ job_id: existing.rows[0].id, cached: false });
}
