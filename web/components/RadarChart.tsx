"use client";

import { useState } from "react";

type RadarScore = {
  value_5?: number;
  label?: string;
};

type RadarScores = {
  mainstreamness?: RadarScore;
  oldness?: RadarScore;
  endurance?: RadarScore;
  reviewness?: RadarScore;
};

type RadarAxis = {
  id: keyof RadarScores;
  axisId: string;
  svgTitle: string;
  svgSubtitle: string;
};

type RadarBackCopy = {
  intro: string;
  steps: string[];
};

type RadarEditorialAxis = {
  axis_id?: string;
  technical_axis_id?: string;
  label?: string;
  title?: string;
  one_line?: string;
  one_liner?: string;
  cran?: number;
  image?: string | null;
  image_src?: string | null;
  illustration?: string | null;
};

type RadarEditorial = {
  title?: string;
  subtitle?: string;
  axes?: Record<string, RadarEditorialAxis>;
};

const axes: RadarAxis[] = [
  {
    id: "mainstreamness",
    axisId: "mainstreamness",
    svgTitle: "mainstreamness",
    svgSubtitle: "À quel point as-tu vu des films mainstream ?",
  },
  {
    id: "oldness",
    axisId: "oldness",
    svgTitle: "oldness",
    svgSubtitle: "À quel point as-tu vu des films récents ?",
  },
  {
    id: "endurance",
    axisId: "staminess",
    svgTitle: "staminess",
    svgSubtitle: "À quel point as-tu aimé des films longs ?",
  },
  {
    id: "reviewness",
    axisId: "reviewness",
    svgTitle: "reviewness",
    svgSubtitle: "À quel point as-tu laissé des reviews ?",
  },
];

const radarBackCopy: Record<keyof RadarScores, RadarBackCopy> = {
  mainstreamness: {
    intro: "Mesuré à partir de la popularité moyenne de tes films, selon leur volume de vues.",
    steps: [
      "1/5 : moins de 25 k vues en moyenne",
      "2/5 : de 25 k à 100 k",
      "3/5 : de 100 k à 300 k",
      "4/5 : de 300 k à 900 k",
      "5/5 : plus de 900 k",
    ],
  },
  oldness: {
    intro: "Mesuré à partir de l’année moyenne de sortie de tes films récents.",
    steps: [
      "1/5 : moyenne avant 1975",
      "2/5 : moyenne entre 1975 et 1989",
      "3/5 : moyenne entre 1990 et 2004",
      "4/5 : moyenne entre 2005 et 2016",
      "5/5 : moyenne à partir de 2017",
    ],
  },
  endurance: {
    intro: "Mesuré à partir de la durée moyenne des films que tu as le mieux notés.",
    steps: [
      "1/5 : moins de 95 min",
      "2/5 : de 95 à 104 min",
      "3/5 : de 105 à 114 min",
      "4/5 : de 115 à 124 min",
      "5/5 : 125 min et plus",
    ],
  },
  reviewness: {
    intro: "Mesuré à partir du nombre de films accompagnés d’une review parmi tes 50 derniers logs.",
    steps: [
      "1/5 : 0 à 11 reviews",
      "2/5 : 12 à 22 reviews",
      "3/5 : 23 à 32 reviews",
      "4/5 : 33 à 42 reviews",
      "5/5 : 43 à 50 reviews",
    ],
  },
};

const radarSectionTitle = "Qui es-tu vraiment ?";
const radarSectionSubtitle = "Quatre axes, quatre archétypes : voyons ton rapport récent aux films.";

const center = 260;
const radius = 150;

function clampScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(1, Math.min(5, value));
}

function displayCran(value: number | null | undefined) {
  if (!value) {
    return "1/5";
  }
  return `${value}/5`;
}

function editorialLine(editorial: RadarEditorialAxis) {
  return editorial.one_line || editorial.one_liner || "";
}

function fallbackEditorial(axis: RadarAxis, value: number | null, score?: RadarScore): RadarEditorialAxis {
  return {
    axis_id: axis.axisId,
    technical_axis_id: axis.id,
    title: score?.label || axis.axisId,
    one_line: "",
    cran: value ?? 1,
  };
}

function pointFor(index: number, value: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
  const distance = radius * (value / 5);
  return {
    x: center + Math.cos(angle) * distance,
    y: center + Math.sin(angle) * distance,
  };
}

function polygonPoints(value: number) {
  return axes
    .map((_, index) => pointFor(index, value))
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

function labelPoint(index: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
  const distance = radius + 76;
  return {
    x: center + Math.cos(angle) * distance,
    y: center + Math.sin(angle) * distance,
  };
}

export default function RadarChart({
  radarScores,
  radarEditorial,
}: {
  radarScores?: RadarScores;
  radarEditorial?: RadarEditorial;
}) {
  const [flippedCards, setFlippedCards] = useState<Partial<Record<keyof RadarScores, boolean>>>({});
  const values = axes.map((axis) => clampScore(radarScores?.[axis.id]?.value_5));
  const hasAllScores = values.every((value) => value !== null);

  function toggleCard(axisId: keyof RadarScores) {
    setFlippedCards((current) => ({
      ...current,
      [axisId]: !current[axisId],
    }));
  }

  if (!hasAllScores) {
    return (
      <section className="radar-section" aria-label="Profil radar">
        <div className="sectionHeading">
          <p className="eyebrow">PROFIL RADAR</p>
          <h2>{radarSectionTitle}</h2>
          <p className="radar-unavailable">Radar indisponible</p>
        </div>
      </section>
    );
  }

  const shapePoints = values
    .map((value, index) => pointFor(index, value ?? 0))
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <section className="radar-section" aria-label="Profil radar">
      <div className="sectionHeading">
        <p className="eyebrow">PROFIL RADAR</p>
        <h2>{radarSectionTitle}</h2>
        <p>{radarSectionSubtitle}</p>
      </div>

      <div className="radar-card">
        <div className="radar-figure">
          <svg viewBox="-125 -28 770 578" role="img" width="620" height="430">
            {[1, 2, 3, 4, 5].map((step) => (
              <polygon
                className="radar-grid"
                key={step}
                points={polygonPoints(step)}
                fill="none"
                stroke="rgba(247, 238, 220, 0.18)"
                strokeWidth="1"
              />
            ))}
            {axes.map((_, index) => {
              const end = pointFor(index, 5);
              return (
                <line
                  className="radar-axis"
                  key={`axis-${index}`}
                  x1={center}
                  y1={center}
                  x2={end.x}
                  y2={end.y}
                  stroke="rgba(247, 238, 220, 0.22)"
                  strokeWidth="1"
                />
              );
            })}
            <polygon
              className="radar-shape"
              points={shapePoints}
              fill="rgba(217, 164, 65, 0.12)"
              stroke="#d9a441"
              strokeWidth="2"
            />
            {values.map((value, index) => {
              const point = pointFor(index, value ?? 0);
              const axis = axes[index];
              const editorial =
                radarEditorial?.axes?.[axis.id] ||
                fallbackEditorial(axis, value, radarScores?.[axis.id]);
              const meta = `${editorial.axis_id || axis.axisId} ${displayCran(editorial.cran ?? value)}`;
              const pointLabel = `${editorial.title}${
                editorialLine(editorial) ? ` - ${editorialLine(editorial)}` : ""
              } (${meta})`;
              return (
                <g aria-label={pointLabel} data-axis={axis.id} key={axis.id}>
                  <circle
                    className="radar-point"
                    cx={point.x}
                    cy={point.y}
                    r="5.5"
                    fill="#f2e6cf"
                    stroke="#d9a441"
                    strokeWidth="2"
                  />
                </g>
              );
            })}
            {axes.map((axis, index) => {
              const point = labelPoint(index);
              return (
                <text
                  className="radar-label-svg"
                  key={`label-${axis.id}`}
                  x={point.x}
                  y={point.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  <tspan className="radar-label-title" x={point.x} dy="-0.55em">
                    {axis.svgTitle}
                  </tspan>
                  <tspan className="radar-label-subtitle" x={point.x} dy="1.45em">
                    {axis.svgSubtitle}
                  </tspan>
                </text>
              );
            })}
          </svg>
        </div>

        <div className="radar-score-list">
          {axes.map((axis, index) => {
            const score = radarScores?.[axis.id];
            const editorial =
              radarEditorial?.axes?.[axis.id] ||
              fallbackEditorial(axis, values[index], score);
            const isFlipped = Boolean(flippedCards[axis.id]);
            const title = editorial.title || score?.label || axis.axisId;
            const scoreMeta = `${editorial.axis_id || axis.axisId} ${displayCran(
              editorial.cran ?? values[index],
            )}`;
            const backCopy = radarBackCopy[axis.id];
            return (
              <button
                aria-label={`${title}. ${
                  isFlipped ? "Afficher la face résumé" : "Afficher comment ce score est calculé"
                }.`}
                aria-pressed={isFlipped}
                className={`radar-score-item radar-score-flip${isFlipped ? " is-flipped" : ""}`}
                key={axis.id}
                onClick={() => toggleCard(axis.id)}
                type="button"
              >
                <span className="radar-flip-inner">
                  <span aria-hidden={isFlipped} className="radar-score-face radar-score-front">
                    <strong>{title}</strong>
                    {editorialLine(editorial) ? <p>{editorialLine(editorial)}</p> : null}
                    <small>{scoreMeta}</small>
                  </span>
                  <span aria-hidden={!isFlipped} className="radar-score-face radar-score-back">
                    <p>{backCopy.intro}</p>
                    <ul>
                      {backCopy.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
