import { cookies } from "next/headers";
import ContinentMap from "../../components/hall-of-fame/ContinentMap";
import HallOfFameCTA from "../../components/hall-of-fame/HallOfFameCTA";
import Podium from "../../components/hall-of-fame/Podium";
import Link from "next/link";
import { currentMonth, firstSeason, getMonthlyRankings, getOptInStatus, nextMonthLabel, seasonTitle, shiftMonth } from "../../lib/hallOfFame";
import { MY_PSEUDO_COOKIE } from "../../lib/myPseudo";
import { OWNER_COOKIE, verifyOwner } from "../../lib/ownerCookie";
import { normalizeUsername, USERNAME_PATTERN } from "../../lib/username";
import BrandLockup from "../../components/BrandLockup";

// Rankings depend on live opt-in state written by the API route, so this
// page must never be statically cached — recomputed on every request.
export const dynamic = "force-dynamic";

export default async function HallOfFamePage() {
  const month = currentMonth();
  const [rankings, first] = await Promise.all([getMonthlyRankings(month), firstSeason()]);
  const previous = shiftMonth(month, -1);
  const podiumsByKey = Object.fromEntries(rankings.podiums.map((podium) => [podium.key, podium]));
  // Le choix exige le cookie signé fifty_owner (posé par POST /api/profile). fifty_pseudo, lui, ne
  // sert qu'au lien « Mon wrapped » : sans cookie signé valide, le statut reste « none ».
  const myPseudo = verifyOwner(cookies().get(OWNER_COOKIE)?.value);
  const rawPseudo = normalizeUsername(cookies().get(MY_PSEUDO_COOKIE)?.value ?? "");
  const wrappedPseudo = myPseudo ?? (USERNAME_PATTERN.test(rawPseudo) ? rawPseudo : null);
  const status = await getOptInStatus(month, myPseudo);
  // Hors saison : seul le premier podium est rendu, sans pseudos. Rien d'autre ne part vers le navigateur
  // (le flou n'est qu'un effet visuel, l'anonymat vient d'ici).
  const locked = status !== "in";
  const teaser = podiumsByKey.mainstream;
  const maskedEntries = teaser.entries.map((entry) => ({ rank: entry.rank, username: "", metricLabel: entry.metricLabel }));

  return (
    <main className="hof-shell pageShell">
      <header className="siteHeader">
        <BrandLockup />
      </header>
      {status === "in" || status === "out" ? <HallOfFameCTA username={myPseudo} month={month} status={status} /> : null}

      {first && previous >= first ? (
        <nav className="hofSeasonNav" aria-label="Saisons">
          <Link href={`/hall-of-fame/saison/${previous}`}>‹ Saison {seasonTitle(previous)}</Link>
        </nav>
      ) : null}

      <section className="hofMasthead">
        <h1 className="hofMastheadTitle">Hall of Fame</h1>
        <p className="hofEyebrow">Saison {seasonTitle(month)}</p>
        {locked ? null : (
          <p className="hofLede hofLedeCentered">
            <span className="verbPointer">Clique</span>
            <span className="verbTouch">Appuie</span> sur les bulles pour découvrir le profil Letterboxd derrière&nbsp;!
          </p>
        )}
        <div className="hofSeasonMeta">
          <span>
            <b>{rankings.participantCount}</b> profil{rankings.participantCount === 1 ? "" : "s"} figé
            {rankings.participantCount === 1 ? "" : "s"}
          </span>
          <span>
            Nouveau tirage le <b>{nextMonthLabel(month)}</b>
          </span>
        </div>
      </section>

      {status === "undecided" || status === "none" ? (
        <HallOfFameCTA username={myPseudo} wrappedPseudo={wrappedPseudo} month={month} status={status} />
      ) : null}

      {rankings.participantCount > 0 && locked ? (
        <section className="hofLocked" aria-label="Aperçu du Hall of Fame">
          <div className="hofPodiumPair hofPodiumSingle">
            <Podium title={teaser.title} sub={teaser.sub} entries={maskedEntries} masked />
          </div>
          <div className="hofLockedVeil">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <p className="hofLockedTitle">Qui est sur le podium&nbsp;?</p>
            <p className="hofLede hofLedeCentered">
              Les pseudos et les autres classements se dévoilent quand tu rejoins la saison.
            </p>
          </div>
        </section>
      ) : rankings.participantCount === 0 ? (
        <section className="hofEmptySeason">
          <p>Personne n’a encore rejoint le Hall of Fame de ce mois — reviens bientôt.</p>
        </section>
      ) : (
        <section aria-label="Podiums">
          <div className="hofPodiumPair">
            <Podium
              title={podiumsByKey.mainstream.title}
              sub={podiumsByKey.mainstream.sub}
              entries={podiumsByKey.mainstream.entries}
            />
            <Podium title={podiumsByKey.niche.title} sub={podiumsByKey.niche.sub} entries={podiumsByKey.niche.entries} />
          </div>
          <div className="hofPodiumPair">
            <Podium
              title={podiumsByKey.critique.title}
              sub={podiumsByKey.critique.sub}
              entries={podiumsByKey.critique.entries}
            />
            <Podium
              title={podiumsByKey.fantome.title}
              sub={podiumsByKey.fantome.sub}
              entries={podiumsByKey.fantome.entries}
            />
          </div>
          <div className="hofPodiumPair">
            <Podium
              title={podiumsByKey.nostalgique.title}
              sub={podiumsByKey.nostalgique.sub}
              entries={podiumsByKey.nostalgique.entries}
            />
            <Podium
              title={podiumsByKey.sorties_annee.title}
              sub={podiumsByKey.sorties_annee.sub}
              entries={podiumsByKey.sorties_annee.entries}
            />
          </div>
        </section>
      )}

      {rankings.participantCount > 0 && !locked ? (
        <section className="hofContinentsSection" aria-label="Cinéma du monde par continent">
          <div className="hofContinentsIntro">
            <h2 className="hofContinentsTitle">Les tops par continent</h2>
            <p className="hofLede hofLedeCentered">
              Basé sur la provenance des films regardés. Un seul cinéphile mis en avant par continent.
            </p>
          </div>
          <ContinentMap winners={rankings.continentWinners} />
        </section>
      ) : null}
    </main>
  );
}
