"use client";

import { useState } from "react";
import { CONTINENTS, type Continent, type ContinentWinner } from "../../lib/hallOfFameTypes";

// Six simplified, non-geographic zones (no per-country borders) — just
// enough shape to read as "a map" while staying decorative. Anchor points
// are fixed per continent; only whether a pin renders there (and who it
// names) depends on live data.
const ZONES: { continent: Continent; path: string; label: string; labelX: number; labelY: number }[] = [
  {
    continent: "Amérique du Nord",
    path: "M 70,30 C 30,45 20,90 40,130 C 60,165 110,175 150,160 C 195,145 205,95 185,60 C 165,25 110,15 70,30 Z",
    label: "AMÉRIQUE DU NORD",
    labelX: 105,
    labelY: 182,
  },
  {
    continent: "Amérique du Sud",
    path: "M 160,190 C 135,210 125,260 140,300 C 152,335 180,360 205,345 C 228,330 232,280 220,240 C 210,205 185,175 160,190 Z",
    label: "AMÉRIQUE DU SUD",
    labelX: 178,
    labelY: 368,
  },
  {
    continent: "Europe",
    path: "M 300,22 C 272,36 265,78 288,107 C 308,132 358,131 384,106 C 407,84 402,44 374,24 C 355,10 322,11 300,22 Z",
    label: "EUROPE",
    labelX: 345,
    labelY: 8,
  },
  {
    continent: "Afrique",
    path: "M 320,130 C 295,155 288,210 305,260 C 320,300 355,325 385,310 C 412,297 420,240 410,190 C 402,150 350,110 320,130 Z",
    label: "AFRIQUE",
    labelX: 355,
    labelY: 332,
  },
  {
    continent: "Asie",
    path: "M 440,30 C 420,60 425,110 450,140 C 470,165 520,175 570,165 C 630,152 680,120 690,80 C 698,48 660,20 600,18 C 540,16 465,10 440,30 Z",
    label: "ASIE",
    labelX: 560,
    labelY: 12,
  },
  {
    continent: "Océanie",
    path: "M 590,260 C 575,280 578,310 600,325 C 622,340 655,335 670,315 C 683,298 678,272 655,258 C 638,248 605,245 590,260 Z",
    label: "OCÉANIE",
    labelX: 628,
    labelY: 344,
  },
];

const PIN_ANCHORS: Record<Continent, { x: number; y: number }> = {
  "Amérique du Nord": { x: 112, y: 95 },
  "Amérique du Sud": { x: 178, y: 262 },
  Europe: { x: 342, y: 68 },
  Afrique: { x: 355, y: 218 },
  Asie: { x: 558, y: 92 },
  Océanie: { x: 628, y: 292 },
};

const VIEWBOX_WIDTH = 760;
const VIEWBOX_HEIGHT = 380;

function initials(name: string): string {
  const cleaned = name.replace(/[._-]/g, " ").trim();
  return (cleaned[0] ?? "?").toUpperCase();
}

export default function ContinentMap({
  winners,
}: {
  winners: Partial<Record<Continent, ContinentWinner>>;
}) {
  const [hoveredContinent, setHoveredContinent] = useState<Continent | null>(null);
  const hasAnyWinner = CONTINENTS.some((continent) => winners[continent]);
  const hoveredWinner = hoveredContinent ? winners[hoveredContinent] : null;
  const hoveredAnchor = hoveredContinent ? PIN_ANCHORS[hoveredContinent] : null;

  return (
    <div className="hofMapWrap">
      <svg
        className="hofWorldMap"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Cinéma du monde par continent"
      >
        <g className="hofGraticule">
          <line x1="0" y1="95" x2="760" y2="95" />
          <line x1="0" y1="190" x2="760" y2="190" />
          <line x1="0" y1="285" x2="760" y2="285" />
          <line x1="190" y1="0" x2="190" y2="380" />
          <line x1="380" y1="0" x2="380" y2="380" />
          <line x1="570" y1="0" x2="570" y2="380" />
        </g>

        {ZONES.map((zone) => (
          <g key={zone.continent}>
            <path className="hofZone" d={zone.path} />
            <text className="hofZoneLabel" x={zone.labelX} y={zone.labelY}>
              {zone.label}
            </text>
          </g>
        ))}

        {CONTINENTS.map((continent) => {
          const winner = winners[continent];
          if (!winner) return null;
          const anchor = PIN_ANCHORS[continent];
          return (
            <g key={continent} transform={`translate(${anchor.x}, ${anchor.y})`}>
              <a
                href={`/profile/${encodeURIComponent(winner.username)}`}
                className="hofPin"
                onMouseEnter={() => setHoveredContinent(continent)}
                onMouseLeave={() => setHoveredContinent((current) => (current === continent ? null : current))}
                onFocus={() => setHoveredContinent(continent)}
                onBlur={() => setHoveredContinent((current) => (current === continent ? null : current))}
              >
                <circle r="15" className="hofPinRing" />
                <text className="hofPinInitial" y="1" dominantBaseline="central">
                  {initials(winner.username)}
                </text>
                <text className="hofPinName" y="26">
                  {winner.username}
                </text>
                <text className="hofPinMetric" y="38">
                  {winner.filmCount} film{winner.filmCount > 1 ? "s" : ""}
                </text>
              </a>
            </g>
          );
        })}
      </svg>

      {hoveredWinner && hoveredAnchor && hoveredWinner.films.length > 0 ? (
        <div
          className="hofPinTooltip"
          style={{
            left: `${(hoveredAnchor.x / VIEWBOX_WIDTH) * 100}%`,
            top: `${(hoveredAnchor.y / VIEWBOX_HEIGHT) * 100}%`,
          }}
        >
          <strong>{hoveredWinner.username}</strong>
          <span>Classé·e grâce à ces films</span>
          <ul>
            {hoveredWinner.films.map((film) => (
              <li key={`${film.slug ?? film.title}-${film.year}`}>
                {film.title}
                {film.year ? <em>{film.year}</em> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!hasAnyWinner ? (
        <p className="hofMapNote">Pas encore de consommation claire par continent ce mois-ci.</p>
      ) : null}
    </div>
  );
}
