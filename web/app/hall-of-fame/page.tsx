import ContinentMap from "../../components/hall-of-fame/ContinentMap";
import Podium from "../../components/hall-of-fame/Podium";
import { currentMonth, getMonthlyRankings, nextMonthLabel, seasonTitle } from "../../lib/hallOfFame";
import BrandLockup from "../../components/BrandLockup";

// Rankings depend on live opt-in state written by the API route, so this
// page must never be statically cached — recomputed on every request.
export const dynamic = "force-dynamic";

export default async function HallOfFamePage() {
  const month = currentMonth();
  const rankings = await getMonthlyRankings(month);
  const podiumsByKey = Object.fromEntries(rankings.podiums.map((podium) => [podium.key, podium]));

  return (
    <main className="hof-shell pageShell">
      <header className="siteHeader">
        <BrandLockup />
      </header>

      <section className="hofMasthead">
        <h1 className="hofMastheadTitle">Hall of Fame</h1>
        <p className="hofEyebrow">Saison {seasonTitle(month)}</p>
        <p className="hofLede hofLedeCentered">
          <span className="verbPointer">Clique</span>
          <span className="verbTouch">Appuie</span> sur les bulles pour découvrir le profil Letterboxd derrière&nbsp;!
        </p>
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

      {rankings.participantCount === 0 ? (
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

      {rankings.participantCount > 0 ? (
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
