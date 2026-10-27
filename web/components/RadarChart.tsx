"use client";

import { useEffect, useRef, useState } from "react";

type RadarScore = {
  value_5?: number;
  label?: string;
  // Présent à partir du 1er novembre 2026 : signale le nouveau calcul (scripts/mainstream_estimate.py).
  median_views?: number | null;
  // « Plus mainstream que 77 % des profils Fifty » (scripts/mainstream_estimate.py).
  comparison?: string | null;
};

type RadarScores = {
  mainstreamness?: RadarScore;
  oldness?: RadarScore;
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
    svgSubtitle: "À quel point as-tu vu des films mainstream récemment ?",
  },
  {
    id: "oldness",
    axisId: "oldness",
    svgTitle: "oldness",
    svgSubtitle: "À quel point as-tu vu des films réalisés récemment ?",
  },
  {
    id: "reviewness",
    axisId: "reviewness",
    svgTitle: "reviewness",
    svgSubtitle: "À quel point as-tu laissé des reviews sur tes films vus récemment ?",
  },
];

const radarBackCopy: Record<keyof RadarScores, RadarBackCopy> = {
  mainstreamness: {
    intro: "Chaque film reçoit un score de popularité (0 à 100) sur une échelle logarithmique entre 1 000 vues (très niche) et 1 million de vues (très mainstream), puis on fait la moyenne sur tes films.",
    steps: [
      "1/5 : score moyen de 0 à 45/100",
      "2/5 : score moyen de 46 à 65/100",
      "3/5 : score moyen de 66 à 80/100",
      "4/5 : score moyen de 81 à 92/100",
      "5/5 : score moyen de 93 à 100/100",
    ],
  },
  oldness: {
    intro: "Mesuré à partir de l’année moyenne de sortie de tes films récents.",
    steps: [
      "1/5 : moyenne avant 1975",
      "2/5 : moyenne entre 1975 et 1989",
      "3/5 : moyenne entre 1990 et 2004",
      "4/5 : moyenne entre 2005 et 2015",
      "5/5 : moyenne à partir de 2016",
    ],
  },
  reviewness: {
    intro: "On mesure le nombre de films loggés sous lesquels tu as laissé une review.",
    steps: [
      "1/5 : 0 à 8 reviews",
      "2/5 : 9 à 17 reviews",
      "3/5 : 18 à 29 reviews",
      "4/5 : 30 à 42 reviews",
      "5/5 : 43 à 50 reviews",
    ],
  },
};

// Méthode du recalibrage de novembre 2026 (mainstream + époque), affichée dès
// que le profil a été calculé avec (champ median_views présent).
const radarBackCopyRecalibrated: Partial<Record<keyof RadarScores, RadarBackCopy>> = {
  mainstreamness: {
    intro:
      "On prend les vues Letterboxd de chacun de tes films. Si on ne les a pas, on estime ses vues d’après la place du film parmi ceux de son année (TMDB). On identifie ton film mainstream « médian » et on te situe parmi les profils Fifty grâce à une ventilation par crans. Répartition des profils Fifty : 10 % au cran 1, 20 % au 2, 40 % au 3, 20 % au 4, 10 % au 5.",
    steps: [
      "1/5 : film du milieu sous 104 000 vues",
      "2/5 : de 104 000 à 194 000 vues",
      "3/5 : de 194 000 à 321 000 vues",
      "4/5 : de 321 000 à 796 000 vues",
      "5/5 : au-delà de 796 000 vues",
    ],
  },
  oldness: {
    intro:
      "On mesure l’âge moyen de tes films par années écoulées depuis leur sortie. Là aussi, on te situe parmi les profils Fifty en ventilant par crans ces années écoulées. Répartition des profils Fifty : 10 % au cran 1, 20 % au 2, 40 % au 3, 20 % au 4, 10 % au 5.",
    steps: [
      "1/5 : âge moyen de 19 ans ou plus",
      "2/5 : de 17 à 19 ans",
      "3/5 : de 13 à 17 ans",
      "4/5 : de 10 à 13 ans",
      "5/5 : moins de 10 ans",
    ],
  },
};

const radarSectionTitle = "Le Triangle";
const radarSectionSubtitle = "Trois axes, trois archétypes : voyons ton rapport récent aux films.";

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

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
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
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const values = axes.map((axis) => clampScore(radarScores?.[axis.id]?.value_5));
  const hasAllScores = values.every((value) => value !== null);

  function toggleCard(axisId: keyof RadarScores) {
    setFlippedCards((current) => ({
      ...current,
      [axisId]: !current[axisId],
    }));
  }

  // Points slide out from the center each time the chart enters view — not just
  // once: scrolling away and back replays it, so a visitor scrolling back up
  // sees it again.
  useEffect(() => {
    if (!hasAllScores) return;
    const node = sectionRef.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }

    let rafId = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.disconnect(); // une seule fois par visite de la page (bug de scroll, 27/10/2026)
          cancelAnimationFrame(rafId);
          setProgress(0);
          const duration = 1000;
          const startTime = performance.now();
          function tick(now: number) {
            const t = Math.max(0, Math.min(1, (now - startTime) / duration));
            setProgress(easeOutCubic(t));
            if (t < 1) rafId = requestAnimationFrame(tick);
          }
          rafId = requestAnimationFrame(tick);
        });
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [hasAllScores]);

  if (!hasAllScores) {
    return (
      <section className="radar-section" aria-label="Profil radar">
        <div className="sectionHeading">
            <h2>{radarSectionTitle}</h2>
          <p className="radar-unavailable">Radar indisponible</p>
        </div>
      </section>
    );
  }

  const animatedValues = values.map((value) => (value ?? 0) * progress);
  const shapePoints = animatedValues
    .map((value, index) => pointFor(index, value))
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <section className="radar-section" aria-label="Profil radar" ref={sectionRef}>
      <div className="sectionHeading">
        <h2>{radarSectionTitle}</h2>
        <p>{radarSectionSubtitle}</p>
      </div>

      <div className="radar-card">
        <div className="radar-figure">
          <svg viewBox="-125 -28 770 465" role="img" width="620" height="346">
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
              const point = pointFor(index, animatedValues[index]);
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
            const backCopy =
              (radarScores?.mainstreamness?.median_views ? radarBackCopyRecalibrated[axis.id] : undefined) ??
              radarBackCopy[axis.id];
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
                    {score?.comparison ? <em className="radar-score-comparison">{score.comparison}</em> : null}
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
