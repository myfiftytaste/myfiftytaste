import { avatarColorClass, initials, type AvatarColor } from "../../lib/avatarColor";
import type { ProfileCardData } from "../../lib/hallOfFameTypes";
import { ProfileBubble } from "./ProfileCard";

export type PodiumEntry = {
  rank: 1 | 2 | 3;
  username: string;
  metricLabel: string;
  color?: AvatarColor;
};

export default function Podium({
  title,
  sub,
  entries,
  masked = false,
  cards = {},
}: {
  title: string;
  sub: string;
  entries: PodiumEntry[];
  // Encadrés de profil, par pseudo en minuscules (absent hors saison).
  cards?: Record<string, ProfileCardData>;
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
          <ProfileBubble
            key={entry.rank}
            username={entry.username}
            color={entry.color}
            card={cards[entry.username.toLowerCase()]}
            ariaLabel={`${entry.username}, ${entry.metricLabel}, rang ${entry.rank}`}
            className={`hofStep hofStep${entry.rank}`}
          >
            <div className={`hofAvatar${avatarColorClass(entry.color)}`}>{initials(entry.username)}</div>
            <div className="hofPseudo">
              {entry.username} <span aria-hidden="true">↗</span>
            </div>
            <div className="hofMetric">{entry.metricLabel}</div>
            <div className="hofRiser">
              <span>{entry.rank}</span>
            </div>
          </ProfileBubble>
        ))}
      </div>
    </div>
  );
}
