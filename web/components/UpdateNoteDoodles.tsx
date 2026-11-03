import type { ReactNode } from "react";

// Croquis « au stylo » de la note de mise à jour (03/11/2026) : SVG en traits seuls, encre bleue
// (stylo bille) et rouge (correcteur), légèrement tremblés par le filtre #noteRough posé une fois
// dans la feuille (<NoteRoughFilter />). Décoratifs : aria-hidden, tout est dit dans le texte.

export function NoteRoughFilter() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <filter id="noteRough">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

function Doodle({ viewBox, side = "right", tilt = 0, children }: { viewBox: string; side?: "right" | "left" | "center"; tilt?: number; children: ReactNode }) {
  return (
    <svg
      className={`noteDoodle noteDoodle-${side}`}
      viewBox={viewBox}
      style={{ transform: `rotate(${tilt}deg)` }}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Mot entouré au feutre rouge, dans le fil du texte. */
export function Circled({ children }: { children: ReactNode }) {
  return (
    <span className="noteCircled">
      {children}
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M8 22 C 6 6, 70 2, 92 12 C 102 18, 96 34, 52 36 C 20 38, 2 30, 10 16 C 14 10, 30 6, 44 5" />
      </svg>
    </span>
  );
}

export function DoodleTabBar() {
  return (
    <Doodle viewBox="0 0 240 92" side="center" tilt={-1.5}>
      <rect className="ink" x="10" y="34" width="220" height="38" rx="18" />
      {[56, 100, 144, 188].map((x) => (
        <path key={x} className="ink thin" d={`M${x} 40 L${x + 1} 66`} />
      ))}
      <text className="hand tiny" x="33" y="57" textAnchor="middle">Wrapped</text>
      <text className="hand small" x="78" y="58" textAnchor="middle">Liste</text>
      <text className="hand small" x="122" y="58" textAnchor="middle">Hall</text>
      <text className="hand tiny" x="166" y="57" textAnchor="middle">FiftyGuess</text>
      <text className="hand small" x="209" y="58" textAnchor="middle">···</text>
      <path className="red" d="M196 6 C 214 8, 222 18, 214 30 M206 24 L214 31 L220 22" />
      <text className="hand redText" x="190" y="12" textAnchor="end">toujours en bas de l&apos;écran</text>
    </Doodle>
  );
}

export function DoodleGuess() {
  // L'affiche cachée (un « ? »), un cercle qui s'ouvre dessus, le chrono à côté.
  return (
    <Doodle viewBox="0 0 200 150" tilt={2.5}>
      <rect className="ink" x="16" y="14" width="80" height="116" rx="3" />
      <path className="ink thin" d="M22 20 L90 20 M22 124 L90 124" />
      <path className="ink" d="M44 52 C 44 34, 70 32, 72 48 C 74 60, 58 62, 57 76 M57 88 L57 91" />
      <circle className="red" cx="70" cy="96" r="6" />
      <circle className="red dashed" cx="70" cy="96" r="15" />
      <circle className="red dashed" cx="70" cy="96" r="27" />
      <path className="red" d="M92 112 C 104 118, 110 120, 118 116" />
      <text className="hand redText" x="124" y="122">ça grandit…</text>
      <circle className="ink" cx="152" cy="64" r="24" />
      <path className="ink" d="M145 36 L159 36 M152 36 L152 40 M152 64 L152 50 M152 64 L163 70" />
      <text className="hand" x="152" y="102" textAnchor="middle">50 s</text>
    </Doodle>
  );
}

export function DoodlePendulum() {
  return (
    <Doodle viewBox="0 0 170 120" tilt={1.5}>
      <path className="ink" d="M14 14 C 60 13, 110 15, 156 14 M24 14 L22 110 M146 14 L148 110" />
      <path className="ink thin" d="M70 15 L72 82 M86 15 L86 82 M102 15 L128 76" />
      <circle className="ink gold" cx="72" cy="88" r="8" />
      <circle className="ink" cx="86" cy="88" r="8" />
      <circle className="ink" cx="131" cy="82" r="8" />
      <path className="red" d="M114 60 C 122 52, 132 56, 136 66" />
      <text className="hand small" x="85" y="114" textAnchor="middle">toc… toc… toc…</text>
    </Doodle>
  );
}

export function DoodlePodium() {
  // Podium 2-1-3 ; sur la marche du milieu, la bulle du premier couronnée de laurier.
  const cx = 90;
  const cy = 54;
  const r = 29;
  const angles = [118, 146, 174, 202, 230];
  const leaf = (deg: number, side: 1 | -1) => {
    const rad = ((side === 1 ? deg : 180 - deg) * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    const rot = (side === 1 ? deg : 180 - deg) + 90 + side * 25;
    return <ellipse key={`${side}-${deg}`} className="ink thin" cx={x} cy={y} rx="9" ry="3.6" transform={`rotate(${rot} ${x} ${y})`} />;
  };
  return (
    <Doodle viewBox="0 0 180 150" side="left" tilt={-1}>
      <path className="ink" d="M18 146 L18 108 L66 108 L66 84 L114 84 L114 118 L162 118 L162 146 Z" />
      <text className="hand" x="42" y="132" textAnchor="middle">2</text>
      <text className="hand" x="90" y="120" textAnchor="middle">1</text>
      <text className="hand" x="138" y="138" textAnchor="middle">3</text>
      <circle className="ink gold" cx={cx} cy={cy} r="17" />
      <text className="hand small" x={cx} y={cy + 4} textAnchor="middle">toi ?</text>
      <path className="ink thin" d={`M${cx - 4} ${cy + r} A ${r} ${r} 0 0 1 ${cx - r * 0.75} ${cy - r * 0.65}`} />
      <path className="ink thin" d={`M${cx + 4} ${cy + r} A ${r} ${r} 0 0 0 ${cx + r * 0.75} ${cy - r * 0.65}`} />
      {angles.map((deg) => leaf(deg, 1))}
      {angles.map((deg) => leaf(deg, -1))}
      <text className="hand redText" x="90" y="14" textAnchor="middle">Top Niche d&apos;octobre ?</text>
    </Doodle>
  );
}

export function DoodleFixettes() {
  // Trois affiches en éventail, la même tête sur deux d'entre elles.
  const face = (x: number, y: number) => (
    <g>
      <circle className="ink thin" cx={x} cy={y} r="7" />
      <path className="ink thin" d={`M${x - 12} ${y + 22} C ${x - 10} ${y + 9}, ${x + 10} ${y + 9}, ${x + 12} ${y + 22}`} />
    </g>
  );
  return (
    <Doodle viewBox="0 0 200 140" tilt={1.5}>
      <g transform="rotate(-14 60 80)">
        <rect className="ink card" x="34" y="34" width="52" height="76" rx="3" />
        {face(60, 62)}
      </g>
      <g transform="rotate(14 140 80)">
        <rect className="ink card" x="114" y="34" width="52" height="76" rx="3" />
        {face(140, 62)}
      </g>
      <rect className="ink card" x="74" y="28" width="52" height="76" rx="3" />
      <path className="ink thin" d="M84 44 L116 44 M84 52 L108 52" />
      <path className="red" d="M52 52 C 70 4, 130 4, 146 52 M139 45 L147 53 L151 43" />
      <text className="hand redText" x="100" y="132" textAnchor="middle">encore cette tête-là !</text>
    </Doodle>
  );
}

export function DoodleThanks() {
  // « Merci, encore » à la main, avec un sourire dessiné (deux yeux, une bouche).
  return (
    <Doodle viewBox="0 0 300 90" side="center" tilt={-2}>
      <text className="hand thanks" x="14" y="56">Merci, encore</text>
      <circle className="ink" cx="232" cy="38" r="1.5" style={{ fill: "var(--note-blue)" }} />
      <circle className="ink" cx="246" cy="38" r="1.5" style={{ fill: "var(--note-blue)" }} />
      <path className="ink" d="M226 48 C 232 57, 246 57, 252 48" />
      <path className="red" d="M16 70 C 80 66, 150 74, 214 68" />
    </Doodle>
  );
}
