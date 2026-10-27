import BadgeRow from "../hall-of-fame/BadgeRow";
import { avatarColorClass, type AvatarColor } from "../../lib/avatarColor";
import { selectDisplayBadges, type Badge } from "../../lib/badgeSelection";

function initials(name: string): string {
  const cleaned = name.replace(/[._-]/g, " ").trim();
  return (cleaned[0] ?? "?").toUpperCase();
}

export default function ProfileBadgesHeader({
  username,
  letterboxdUrl,
  badges,
  avatarColor = null,
}: {
  username: string;
  letterboxdUrl: string;
  badges: Badge[];
  avatarColor?: AvatarColor | null;
}) {
  const { manual, earned, overflowCount } = selectDisplayBadges(badges);

  return (
    <div className="headerCard headerCardIdentity">
      <div className={`headerAvatar${avatarColorClass(avatarColor)}`}>{initials(username)}</div>
      <a className="headerPseudo" href={letterboxdUrl} rel="noreferrer" target="_blank">
        @{username}
      </a>
      <BadgeRow manual={manual} earned={earned} overflowCount={overflowCount} />
    </div>
  );
}
