import type { Metadata } from "next";
import { timingSafeEqual } from "node:crypto";
import { notFound } from "next/navigation";
import BrandLockup from "../../../components/BrandLockup";
import { getPool } from "../../../lib/db";
import { parisToday } from "../../../lib/fiftyguess";

export const metadata: Metadata = { title: "Coulisses · Fiftyguess", robots: { index: false } };
export const dynamic = "force-dynamic";

// Programme de Fiftyguess, visible seulement avec la clé FIFTYGUESS_ADMIN_KEY (variable Vercel) :
// /jeu/coulisses?cle=… (à garder en favori). Sans la bonne clé, la page n'existe pas. Le cookie
// fifty_owner ne suffit pas : n'importe qui peut l'obtenir pour un pseudo en lançant son wrapped.
// Le programme se prépare avec scripts/game_program.py ; pour remplacer un film, l'ajouter à
// « exclude » dans data/config/fiftyguess.json, supprimer sa ligne de game_round et relancer.
function allowed(given: string | undefined) {
  const key = process.env.FIFTYGUESS_ADMIN_KEY?.trim();
  if (!key || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
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
    plays: string;
  }>(
    `SELECT r.id, r.kind, to_char(r.opens_on, 'YYYY-MM-DD') AS opens_on, r.title_fr, r.title_orig, r.year, r.director, r.poster_url,
            (SELECT count(*) FROM game_play p WHERE p.round_id = r.id) AS plays
     FROM game_round r ORDER BY r.opens_on, r.kind DESC`,
  );
  const today = parisToday();

  return (
    <main className="pageShell fgPage">
      <header className="siteHeader">
        <BrandLockup />
      </header>
      <h1 className="diversTitle">Coulisses de Fiftyguess</h1>
      <p className="fgMuted">Programme complet, affiches comprises. Personne d&apos;autre ne voit cette page.</p>
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
              <span className="fgMuted">
                {[round.year, round.director].filter(Boolean).join(" · ")} · {round.plays} partie{Number(round.plays) > 1 ? "s" : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
