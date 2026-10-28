import type { Metadata } from "next";
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import BrandLockup from "../../../components/BrandLockup";
import { getPool } from "../../../lib/db";
import { parisToday } from "../../../lib/fiftyguess";

export const metadata: Metadata = { title: "Coulisses · Fiftyguess", robots: { index: false } };
export const dynamic = "force-dynamic";

// Programme de Fiftyguess, visible seulement avec la clé FIFTYGUESS_ADMIN_KEY (variable Vercel) :
// /jeu/coulisses?cle=… (à garder en favori). Sans la bonne clé, la page n'existe pas. Le cookie
// fifty_owner ne suffit pas : n'importe qui peut l'obtenir pour un pseudo en lançant son wrapped.
// Chaque film arrive « proposé » (scripts/game_program.py) : « Valider » l'ouvre aux joueurs à sa date,
// « Remplacer » l'écarte pour toujours et relance le tirage de la case vide.

function allowed(given: unknown) {
  const key = process.env.FIFTYGUESS_ADMIN_KEY?.trim();
  if (!key || typeof given !== "string" || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Relance le workflow « Programme Fiftyguess » pour remplir la case vide (même jeton que le worker). */
async function redraw(month: string) {
  const token = process.env.GH_dispatch_token;
  if (!token) return console.error("fiftyguess dispatch: GH_dispatch_token absent");
  const res = await fetch("https://api.github.com/repos/myfiftytaste/myfiftytaste/actions/workflows/fiftyguess.yml/dispatches", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "myfiftytaste-web" },
    // La branche déployée : release-v3 sur l'aperçu, main en production.
    body: JSON.stringify({ ref: process.env.VERCEL_GIT_COMMIT_REF || "main", inputs: { months: month } }),
  });
  if (!res.ok) console.error(`fiftyguess dispatch: ${res.status} ${(await res.text()).slice(0, 160)}`);
}

async function validate(form: FormData) {
  "use server";
  if (!allowed(form.get("cle"))) return;
  await getPool().query("UPDATE game_round SET status = 'validated' WHERE id = $1", [Number(form.get("id"))]);
  revalidatePath("/jeu/coulisses");
}

async function replace(form: FormData) {
  "use server";
  if (!allowed(form.get("cle"))) return;
  // Jamais un film déjà joué : sa partie et son classement disparaîtraient avec lui.
  const result = await getPool().query<{ tmdb_id: number; title_fr: string; month: string }>(
    `DELETE FROM game_round r WHERE r.id = $1 AND NOT EXISTS (SELECT 1 FROM game_play p WHERE p.round_id = r.id)
     RETURNING tmdb_id, title_fr, month`,
    [Number(form.get("id"))],
  );
  const removed = result.rows[0];
  if (!removed) return;
  await getPool().query("INSERT INTO game_excluded (tmdb_id, title) VALUES ($1, $2) ON CONFLICT DO NOTHING", [removed.tmdb_id, removed.title_fr]);
  await redraw(removed.month);
  revalidatePath("/jeu/coulisses");
}

export default async function CoulissesPage({ searchParams }: { searchParams: { cle?: string } }) {
  if (!allowed(searchParams.cle)) notFound();
  const result = await getPool().query<{
    id: string;
    kind: string;
    opens_on: string;
    title_fr: string;
    title_orig: string;
    year: number | null;
    director: string | null;
    poster_url: string;
    status: string;
    fame: number | null;
    family: string | null;
    plays: string;
  }>(
    `SELECT r.id, r.kind, to_char(r.opens_on, 'YYYY-MM-DD') AS opens_on, r.title_fr, r.title_orig, r.year, r.director,
            r.poster_url, r.status, r.fame, r.family,
            (SELECT count(*) FROM game_play p WHERE p.round_id = r.id) AS plays
     FROM game_round r ORDER BY r.opens_on, r.kind DESC`,
  );
  const today = parisToday();
  const pending = result.rows.filter((round) => round.status === "proposed").length;

  return (
    <main className="pageShell fgPage">
      <header className="siteHeader">
        <BrandLockup />
      </header>
      <h1 className="diversTitle">Coulisses de Fiftyguess</h1>
      <p className="fgMuted">
        Personne d&apos;autre ne voit cette page. {pending} film{pending > 1 ? "s" : ""} à valider. « Remplacer » écarte le film pour
        toujours et relance le tirage : le remplaçant apparaît ici après quelques minutes (recharge la page).
      </p>
      <ul className="fgBackstage">
        {result.rows.map((round) => (
          <li key={round.id} className={round.opens_on <= today ? "isPast" : ""}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={round.poster_url} alt="" loading="lazy" />
            <span>
              <span className="fgEyebrow">
                {round.kind === "bonus" ? "Bonus · " : ""}
                {new Date(`${round.opens_on}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <b>{round.title_fr}</b>
              {round.title_orig !== round.title_fr ? <span className="fgMuted">{round.title_orig}</span> : null}
              <span className="fgMuted">{[round.year, round.director].filter(Boolean).join(" · ")}</span>
              <span className="fgMuted">
                {round.fame !== null ? `${round.fame.toLocaleString("fr-FR")} vues Wikipédia · ` : ""}
                {round.family ?? "indépendant"} · {round.plays} partie{Number(round.plays) > 1 ? "s" : ""}
              </span>
              {round.status === "validated" ? (
                <span className="fgValidated">Validé</span>
              ) : (
                <span className="fgActions">
                  <form action={validate}>
                    <input type="hidden" name="id" value={round.id} />
                    <input type="hidden" name="cle" value={searchParams.cle} />
                    <button type="submit" className="fgPrimary">
                      Valider
                    </button>
                  </form>
                  <form action={replace}>
                    <input type="hidden" name="id" value={round.id} />
                    <input type="hidden" name="cle" value={searchParams.cle} />
                    <button type="submit" className="fgGhost">
                      Remplacer
                    </button>
                  </form>
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
