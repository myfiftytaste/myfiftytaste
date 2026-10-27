import Link from "next/link";
import { notFound } from "next/navigation";
import BrandLockup from "../../../../components/BrandLockup";
import ContinentMap from "../../../../components/hall-of-fame/ContinentMap";
import Laurels from "../../../../components/hall-of-fame/Laurels";
import { avatarColorClass } from "../../../../lib/avatarColor";
import {
  currentMonth,
  firstSeason,
  getMonthlyRankings,
  MONTH_PATTERN,
  nextMonthLabel,
  seasonTitle,
  shiftMonth,
} from "../../../../lib/hallOfFame";
import { letterboxdProfileUrl } from "../../../../lib/username";

// Saison close du Hall of Fame (maquette validée le 27/10/2026) : seulement les premiers de chaque
// podium, couronnés de lauriers, sans la carte des continents. Ouverte à tous : une saison close est
// de l'histoire, et ses premiers avaient choisi d'y figurer.
export const dynamic = "force-dynamic";

function initials(name: string): string {
  return (name.replace(/[._-]/g, " ").trim()[0] ?? "?").toUpperCase();
}

export default async function SeasonPage({ params }: { params: { month: string } }) {
  const month = params.month;
  const first = await firstSeason();
  if (!MONTH_PATTERN.test(month) || month >= currentMonth() || !first || month < first) notFound();

  const rankings = await getMonthlyRankings(month);
  const winners = rankings.podiums.flatMap((podium) =>
    podium.entries[0] ? [{ title: podium.title, entry: podium.entries[0] }] : [],
  );
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <main className="hof-shell pageShell">
      <header className="siteHeader">
        <BrandLockup />
      </header>
      <nav className="hofSeasonNav" aria-label="Saisons">
        {previous >= first ? (
          <Link href={`/hall-of-fame/saison/${previous}`}>‹ Saison {seasonTitle(previous)}</Link>
        ) : (
          <span />
        )}
        <span className="hofSeasonNavNext">
          <Link href={next >= currentMonth() ? "/hall-of-fame" : `/hall-of-fame/saison/${next}`}>
            Saison {seasonTitle(next)} ›
          </Link>
          {next >= currentMonth() ? <small>(en cours)</small> : null}
        </span>
      </nav>

      <section className="hofMasthead">
        <h1 className="hofMastheadTitle hofSeasonTitle">Saison {seasonTitle(month)}</h1>
        <p className="hofLede hofLedeCentered">
          Saison close · résultats figés le {nextMonthLabel(month)} · {rankings.participantCount} participant
          {rankings.participantCount === 1 ? "" : "s"}
        </p>
      </section>

      {winners.length === 0 ? (
        <section className="hofEmptySeason">
          <p>Personne n’a rejoint le Hall of Fame cette saison-là.</p>
        </section>
      ) : (
        <ul className="hofWinners">
          {winners.map(({ title, entry }) => (
            <li key={title}>
              <a
                className="hofWinner"
                href={letterboxdProfileUrl(entry.username)}
                target="_blank"
                rel="noreferrer"
                aria-label={`${title} : ${entry.username}, ${entry.metricLabel} — profil Letterboxd (nouvel onglet)`}
              >
                <span className="hofWinnerTitle">{title}</span>
                <span className="hofWinnerCrown">
                  <Laurels />
                  <span className={`hofAvatar hofWinnerAvatar${avatarColorClass(entry.color)}`}>{initials(entry.username)}</span>
                </span>
                <span className="hofWinnerPseudo">
                  {entry.username} <span aria-hidden="true">↗</span>
                </span>
                <span className="hofWinnerMetric">{entry.metricLabel}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {winners.length ? (
        <section className="hofContinentsSection" aria-label="Cinéma du monde par continent">
          <div className="hofContinentsIntro">
            <h2 className="hofContinentsTitle">Les tops par continent</h2>
          </div>
          <ContinentMap winners={rankings.continentWinners} />
        </section>
      ) : null}
    </main>
  );
}
