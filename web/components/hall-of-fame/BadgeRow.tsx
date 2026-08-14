"use client";

import { useState } from "react";
import type { Badge } from "../../lib/badgeSelection";

function BadgeIcon() {
  return (
    <svg className="badgeIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 L14.6 9.1 L22 9.5 L16.2 14.3 L18.2 21.5 L12 17.3 L5.8 21.5 L7.8 14.3 L2 9.5 L9.4 9.1 Z" />
    </svg>
  );
}

function BadgePlaque({ badge }: { badge: Badge }) {
  const [expanded, setExpanded] = useState(false);

  // Sans description : rien à afficher au survol/tap, pas la peine d'en
  // faire un bouton interactif.
  if (!badge.description) {
    return (
      <div className="badgePlaque">
        <BadgeIcon />
        <span className="badgeLabel">{badge.label}</span>
      </div>
    );
  }

  // title = survol desktop natif. Mais un survol ne se déclenche jamais au
  // tactile — sans le bouton + l'état "expanded" ci-dessous, la description
  // resterait invisible sur mobile.
  return (
    <button
      type="button"
      className="badgePlaque badgePlaqueInteractive"
      title={badge.description}
      aria-expanded={expanded}
      onClick={() => setExpanded((current) => !current)}
    >
      <BadgeIcon />
      <span className="badgeLabel">{badge.label}</span>
      {expanded ? <span className="badgeDescription">{badge.description}</span> : null}
    </button>
  );
}

// Reused both by the recap page's new header (ProfileBadgesHeader) and
// wherever else a profile's badges need to appear — same component, same
// slot rule, so the two never drift out of sync.
export default function BadgeRow({
  manual,
  earned,
  overflowCount,
}: {
  manual: Badge | null;
  earned: Badge[];
  overflowCount: number;
}) {
  if (!manual && earned.length === 0) {
    return null;
  }

  return (
    <div className="badgeRow">
      {manual ? <BadgePlaque badge={manual} /> : null}
      {earned.map((badge) => (
        <BadgePlaque key={`${badge.category}-${badge.month}`} badge={badge} />
      ))}
      {overflowCount > 0 ? <div className="badgeMore">+{overflowCount}</div> : null}
    </div>
  );
}
