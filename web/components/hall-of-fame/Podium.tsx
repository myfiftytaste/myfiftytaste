import { letterboxdProfileUrl } from "../../lib/username";

export type PodiumEntry = {
  rank: 1 | 2 | 3;
  username: string;
  metricLabel: string;
};

function initials(name: string): string {
  const cleaned = name.replace(/[._-]/g, " ").trim();
  return (cleaned[0] ?? "?").toUpperCase();
}

export default function Podium({
  title,
  sub,
  entries,
  masked = false,
}: {
  title: string;
  sub: string;
  entries: PodiumEntry[];
  // Visiteur hors saison : la page n'envoie que rang et métrique, jamais le pseudo.
  masked?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="hofPodiumBlock">
        <h3>{title}</h3>
        <p className="hofPodiumSub">{sub}</p>
        <p className="hofPodiumEmpty">
          <b>C’est trop calme… j’aime pas trop beaucoup ça.</b>
          <br />
          Personne à classer sur le podium pour l’instant ce mois-ci.
        </p>
      </div>
    );
  }

  return (
    <div className="hofPodiumBlock">
      <h3>{title}</h3>
      <p className="hofPodiumSub">{sub}</p>
      <div className="hofPodium">
        {masked
          ? entries.map((entry) => (
              <div key={entry.rank} className={`hofStep hofStep${entry.rank} hofStepMasked`} aria-label={`Rang ${entry.rank}, pseudo masqué, ${entry.metricLabel}`}>
                <div className="hofAvatar">?</div>
                <div className="hofPseudo">cinéphile</div>
                <div className="hofMetric">{entry.metricLabel}</div>
                <div className="hofRiser">
                  <span>{entry.rank}</span>
                </div>
              </div>
            ))
          : entries.map((entry) => (
          <a
            key={entry.rank}
            href={letterboxdProfileUrl(entry.username)}
            target="_blank"
            rel="noreferrer"
            aria-label={`${entry.username}, ${entry.metricLabel}, rang ${entry.rank} : profil Letterboxd (nouvel onglet)`}
            className={`hofStep hofStep${entry.rank}`}
          >
            <div className="hofAvatar">{initials(entry.username)}</div>
            <div className="hofPseudo">
              {entry.username} <span aria-hidden="true">↗</span>
            </div>
            <div className="hofMetric">{entry.metricLabel}</div>
            <div className="hofRiser">
              <span>{entry.rank}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
