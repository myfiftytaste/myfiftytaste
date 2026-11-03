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

export function DoodleBug() {
  // Un bug (le scroll), barré au feutre rouge.
  return (
    <Doodle viewBox="0 0 150 128" tilt={2}>
      <ellipse className="ink" cx="75" cy="60" rx="22" ry="28" />
      <path className="ink thin" d="M75 34 L75 88 M58 50 C 66 54, 84 54, 92 50" />
      <circle className="ink" cx="75" cy="28" r="9" />
      <path className="ink thin" d="M70 20 C 66 12, 60 10, 56 12 M80 20 C 84 12, 90 10, 94 12" />
      <path className="ink thin" d="M54 52 L40 46 M53 64 L38 66 M56 76 L44 86 M96 52 L110 46 M97 64 L112 66 M94 76 L106 86" />
      <path className="red" d="M34 22 C 70 54, 96 78, 120 100 M120 20 C 92 46, 62 74, 32 98" />
      <text className="hand redText" x="75" y="122" textAnchor="middle">corrigé !</text>
    </Doodle>
  );
}
