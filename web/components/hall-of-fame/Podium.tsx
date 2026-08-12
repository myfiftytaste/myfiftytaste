import Link from "next/link";

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
}: {
  title: string;
  sub: string;
  entries: PodiumEntry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="hofPodiumBlock">
        <h3>{title}</h3>
        <p className="hofPodiumSub">{sub}</p>
        <p className="hofPodiumEmpty">Personne à classer pour l’instant ce mois-ci.</p>
      </div>
    );
  }

  return (
    <div className="hofPodiumBlock">
      <h3>{title}</h3>
      <p className="hofPodiumSub">{sub}</p>
      <div className="hofPodium">
        {entries.map((entry) => (
          <Link
            key={entry.rank}
            href={`/profile/${encodeURIComponent(entry.username)}`}
            className={`hofStep hofStep${entry.rank}`}
          >
            <div className="hofAvatar">{initials(entry.username)}</div>
            <div className="hofPseudo">{entry.username}</div>
            <div className="hofMetric">{entry.metricLabel}</div>
            <div className="hofRiser">
              <span>{entry.rank}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
