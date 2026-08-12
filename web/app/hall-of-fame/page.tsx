import Image from "next/image";
import Link from "next/link";
import ContinentMap from "../../components/hall-of-fame/ContinentMap";
import Podium from "../../components/hall-of-fame/Podium";
import { currentMonth, getMonthlyRankings, nextMonthLabel, seasonTitle } from "../../lib/hallOfFame";

// Rankings depend on live opt-in state written by the API route, so this
// page must never be statically cached — recomputed on every request.
export const dynamic = "force-dynamic";

export default async function HallOfFamePage() {
  const month = currentMonth();
  const rankings = await getMonthlyRankings(month);
  const podiumsByKey = Object.fromEntries(rankings.podiums.map((podium) => [podium.key, podium]));

  return (
    <main className="hof-shell pageShell">
      <header className="siteHeader" aria-label="MyFiftyTaste">
        <div className="siteBranding">
          <Link href="/">
            <Image
              src="/branding/logoV1-transparent.png"
              alt="MyFiftyTaste"
              width={1013}
              height={708}
              priority
              className="siteLogo"
            />
          </Link>
        </div>
      </header>

      <section className="hofMasthead">
        <p className="hofEyebrow">Hall of Fame</p>
        <h1 className="hofMastheadTitle">Saison {seasonTitle(month)}</h1>
        <p className="hofLede hofLedeCentered">Les cinéphiles du mois, classés, figés, célébrés.</p>
        <div className="hofSeasonMeta">
          <span>
            <b>{rankings.participantCount}</b> profil{rankings.participantCount === 1 ? "" : "s"} figé
            {rankings.participantCount === 1 ? "" : "s"}
          </span>
          <span>
            Nouveau tirage le <b>{nextMonthLabel(month)}</b>
          </span>
        </div>
        {rankings.participantCount > 0 ? (
          <p className="hofMapNote">Chaque bulle avec un pseudo mène directement à son profil.</p>
        ) : null}
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
            <h2 className="hofContinentsTitle">Le cinéma du monde, par continent</h2>
            <p className="hofLede hofLedeCentered">
              Basé sur la provenance des films regardés — pas sur la localisation du profil Letterboxd. Un seul
              cinéphile mis en avant par continent, seulement s’il y a une consommation claire.
            </p>
          </div>
          <ContinentMap winners={rankings.continentWinners} />
        </section>
      ) : null}
    </main>
  );
}
