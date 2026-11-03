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

/** Mot souligné d'un trait qui part un peu de travers. */
export function Underlined({ children }: { children: ReactNode }) {
  return (
    <span className="noteUnderlined">
      {children}
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M2 6 C 30 3, 60 8, 98 4" />
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
      <text className="hand small" x="33" y="58" textAnchor="middle">Wrapped</text>
      <text className="hand small" x="78" y="58" textAnchor="middle">Liste</text>
      <text className="hand small" x="122" y="58" textAnchor="middle">Hall</text>
      <text className="hand small" x="166" y="58" textAnchor="middle">Jeu</text>
      <text className="hand small" x="209" y="58" textAnchor="middle">···</text>
      <path className="red" d="M196 6 C 214 8, 222 18, 214 30 M206 24 L214 31 L220 22" />
      <text className="hand redText" x="190" y="12" textAnchor="end">toujours en bas de l&apos;écran</text>
    </Doodle>
  );
}

export function DoodleGauge() {
  return (
    <Doodle viewBox="0 0 220 110" tilt={1.5}>
      <path className="ink" d="M12 62 C 70 61, 150 63, 208 62" />
      {[12, 61, 110, 159, 208].map((x, i) => (
        <g key={x}>
          <path className="ink thin" d={`M${x} 57 L${x} 67`} />
          <text className="hand small" x={x} y="82" textAnchor="middle">{i + 1}</text>
        </g>
      ))}
      <circle className="ink gold" cx="132" cy="62" r="8" />
      <circle className="ink" cx="152" cy="62" r="8" />
      <path className="red" d="M132 44 C 133 38, 151 38, 152 44" />
      <text className="hand redText" x="142" y="30" textAnchor="middle">l&apos;écart = ton verdict</text>
      <text className="hand small" x="120" y="104" textAnchor="end">toi</text>
      <path className="ink thin" d="M122 100 C 128 94, 130 82, 131 73" />
      <text className="hand small" x="164" y="104">Letterboxd</text>
      <path className="ink thin" d="M164 98 C 157 92, 154 82, 153 73" />
    </Doodle>
  );
}

export function DoodleMiddleFilm() {
  const heights = [14, 20, 26, 34, 44, 58, 74];
  return (
    <Doodle viewBox="0 0 230 128" side="left" tilt={-2}>
      {heights.map((h, i) => (
        <rect key={i} className="ink" x={14 + i * 28} y={96 - h} width="18" height={h} rx="2" />
      ))}
      <ellipse className="red" cx="107" cy="77" rx="20" ry="32" />
      <path className="ink thin" d="M10 104 C 80 106, 150 103, 220 105 M210 100 L220 105 L210 110" />
      <text className="hand small" x="14" y="122">peu vu</text>
      <text className="hand small" x="216" y="122" textAnchor="end">très vu</text>
      <text className="hand redText" x="107" y="16" textAnchor="middle">le film du milieu</text>
      <text className="hand redText" x="107" y="32" textAnchor="middle">= ton score</text>
    </Doodle>
  );
}

export function DoodleCrans() {
  const shares = [10, 20, 40, 20, 10];
  return (
    <Doodle viewBox="0 -14 200 134" tilt={1}>
      <path className="ink thin" d="M12 96 C 70 97, 130 95, 190 96" />
      {shares.map((share, i) => {
        const h = share * 1.7;
        const x = 22 + i * 34;
        return (
          <g key={i}>
            <path className={i === 2 ? "ink gold" : "ink"} d={`M${x} 96 L${x + 1} ${96 - h} L${x + 24} ${95 - h} L${x + 24} 96`} />
            <text className="hand small" x={x + 12} y={92 - h} textAnchor="middle">{share} %</text>
            <text className="hand small" x={x + 12} y="112" textAnchor="middle">{i + 1}</text>
          </g>
        );
      })}
      <text className="hand redText" x="100" y="-2" textAnchor="middle">la plupart au milieu</text>
    </Doodle>
  );
}

export function DoodleGuess() {
  return (
    <Doodle viewBox="0 0 200 150" side="left" tilt={-2.5}>
      <rect className="ink" x="16" y="14" width="78" height="114" rx="3" />
      <circle className="red dashed" cx="58" cy="64" r="9" />
      <circle className="red dashed" cx="58" cy="64" r="22" />
      <circle className="red dashed" cx="58" cy="64" r="38" />
      <path className="ink thin" d="M70 64 L92 64 M86 59 L93 64 L86 69" />
      <circle className="ink" cx="148" cy="86" r="26" />
      <path className="ink" d="M141 56 L155 56 M148 56 L148 60 M148 86 L148 70 M148 86 L160 92" />
      <text className="hand" x="148" y="134" textAnchor="middle">50 s</text>
      <text className="hand small" x="148" y="30" textAnchor="middle">+1 s, +3 s, +5 s…</text>
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

export function DoodleLaurel() {
  // Deux branches en arc, feuilles en amande inclinées vers l'extérieur.
  const leaves = [0, 1, 2, 3, 4];
  return (
    <Doodle viewBox="0 0 150 116" side="left" tilt={-1}>
      <circle className="ink" cx="75" cy="56" r="19" />
      <text className="hand" x="75" y="63" textAnchor="middle">1</text>
      <path className="ink thin" d="M70 100 C 34 96, 26 60, 42 26" />
      <path className="ink thin" d="M80 100 C 116 96, 124 60, 108 26" />
      {leaves.map((i) => {
        const t = i / 4;
        const y = 96 - t * 68;
        const xIn = 58 - Math.sin(t * Math.PI * 0.9) * 22;
        return (
          <g key={i}>
            <ellipse className="ink thin" cx={xIn - 7} cy={y - 3} rx="8" ry="3.6" transform={`rotate(${-50 + t * 30} ${xIn - 7} ${y - 3})`} />
            <ellipse className="ink thin" cx={150 - xIn + 7} cy={y - 3} rx="8" ry="3.6" transform={`rotate(${50 - t * 30} ${150 - xIn + 7} ${y - 3})`} />
          </g>
        );
      })}
      <text className="hand redText" x="75" y="16" textAnchor="middle">le 1er du mois</text>
    </Doodle>
  );
}
