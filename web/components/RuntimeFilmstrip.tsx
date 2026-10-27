"use client";

import { useEffect, useId, useMemo, useRef } from "react";

type RuntimeCard = {
  title: string;
  value: string | null;
  description: string;
  data_source: string;
};

// Échelle de repli tant que Fifty n'a pas assez de profils (lib/fiftyStats.ts) : sinon les
// bornes suivent la répartition réelle des durées moyennes sur Fifty (5e et 95e centiles),
// pour que la jauge varie vraiment d'un profil à l'autre. Les extrémités affichent ≤ / ≥ :
// une moyenne hors bornes reste vraie dans le grand chiffre, la jauge est juste en butée.
const RUNTIME_LOW = 60; // 1h
const RUNTIME_HIGH = 150; // 2h30

function formatMinutes(total: number) {
  const rounded = Math.round(total);
  return `${Math.floor(rounded / 60)}h${String(rounded % 60).padStart(2, "0")}`;
}

const W = 340;
const MID_Y = 36;
const THICKNESS = 34;
const AMPLITUDE = 3;
const CYCLES = 1.6;
const SAMPLE_COUNT = 48;
const TICK_COUNT = 8;
const HOLE_SPACING = 13;
const HOLE_GAP = 4;

function topY(x: number, phase: number) {
  return MID_Y - THICKNESS / 2 + AMPLITUDE * Math.sin((x / W) * Math.PI * 2 * CYCLES + phase);
}

function bottomY(x: number, phase: number) {
  return MID_Y + THICKNESS / 2 + AMPLITUDE * Math.sin((x / W) * Math.PI * 2 * CYCLES + phase);
}

function ribbonPath(phase: number, xMax: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const x = (xMax * i) / SAMPLE_COUNT;
    pts.push([x, topY(x, phase)]);
  }
  for (let i = SAMPLE_COUNT; i >= 0; i--) {
    const x = (xMax * i) / SAMPLE_COUNT;
    pts.push([x, bottomY(x, phase)]);
  }
  return "M " + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ") + " Z";
}

const holeXs = Array.from({ length: Math.floor(W / HOLE_SPACING) + 1 }, (_, i) =>
  Math.min(i * HOLE_SPACING, W),
);
const tickXs = Array.from({ length: TICK_COUNT - 1 }, (_, i) => (W * (i + 1)) / TICK_COUNT);

export default function RuntimeFilmstrip({
  card,
  averageMinutes,
  variant = "card",
  scale = null,
}: {
  card?: RuntimeCard | null;
  averageMinutes?: number | null;
  // "hero" : petite carte du haut du profil, à côté de la note moyenne (maquette du 26/10/2026).
  variant?: "card" | "hero";
  scale?: { average: number; low: number; high: number } | null;
}) {
  const low = scale?.low ?? RUNTIME_LOW;
  const high = scale?.high ?? RUNTIME_HIGH;
  const hero = variant === "hero";
  const gradId = useId();
  const baseRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const tickRefs = useRef<(SVGLineElement | null)[]>([]);
  const topHoleRefs = useRef<(SVGCircleElement | null)[]>([]);
  const bottomHoleRefs = useRef<(SVGCircleElement | null)[]>([]);

  const hasData = typeof averageMinutes === "number" && Number.isFinite(averageMinutes);
  const fraction = useMemo(
    () =>
      hasData
        ? Math.max(0, Math.min(1, ((averageMinutes as number) - low) / (high - low)))
        : 0,
    [hasData, averageMinutes, low, high],
  );

  useEffect(() => {
    if (!hasData) return;

    function render(phase: number) {
      baseRef.current?.setAttribute("d", ribbonPath(phase, W));
      fillRef.current?.setAttribute("d", ribbonPath(phase, W * fraction));
      tickXs.forEach((x, i) => {
        const el = tickRefs.current[i];
        if (!el) return;
        el.setAttribute("x1", String(x));
        el.setAttribute("y1", String(topY(x, phase) + 2));
        el.setAttribute("x2", String(x));
        el.setAttribute("y2", String(bottomY(x, phase) - 2));
      });
      holeXs.forEach((x, i) => {
        const top = topHoleRefs.current[i];
        const bottom = bottomHoleRefs.current[i];
        top?.setAttribute("cy", String(topY(x, phase) - HOLE_GAP));
        bottom?.setAttribute("cy", String(bottomY(x, phase) + HOLE_GAP));
      });
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      render(0);
      return;
    }

    let rafId = 0;
    let start: number | null = null;
    function frame(ts: number) {
      if (start === null) start = ts;
      render(((ts - start) / 1000) * 0.9);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [hasData, fraction]);

  if (!hasData || !card) {
    return (
      <article className={hero ? "runtimeHeroCard" : "metricCard"} aria-label="Durée moyenne">
        <div className="cardTopline">
          <h3>Durée moyenne</h3>
        </div>
        <p className="cardDescription">Durée moyenne indisponible.</p>
      </article>
    );
  }

  return (
    <article className={hero ? "runtimeHeroCard" : "metricCard"} aria-label={card.title}>
      {hero ? null : (
        <div className="cardTopline">
          <h3>{card.title}</h3>
        </div>
      )}
      <p className="filmstripValue">{card.value}</p>
      <div className="filmstripVisual">
        <svg viewBox={`0 0 ${W} 70`} role="img" aria-label={card.description}>
          <defs>
            <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" style={{ stopColor: "rgba(var(--accent-rgb), 0.65)" }} />
              <stop offset="100%" style={{ stopColor: "var(--accent)" }} />
            </linearGradient>
          </defs>
          <path ref={baseRef} className="ribbonBase" d={ribbonPath(0, W)} />
          <path ref={fillRef} className="ribbonFill" style={{ fill: `url(#${gradId})` }} d={ribbonPath(0, W * fraction)} />
          {tickXs.map((x, i) => (
            <line
              key={x}
              ref={(el) => {
                tickRefs.current[i] = el;
              }}
              className="ribbonTick"
              x1={x}
              y1={topY(x, 0) + 2}
              x2={x}
              y2={bottomY(x, 0) - 2}
            />
          ))}
          {holeXs.map((x, i) => (
            <circle
              key={`t-${x}`}
              ref={(el) => {
                topHoleRefs.current[i] = el;
              }}
              className="ribbonHole"
              cx={x}
              cy={topY(x, 0) - HOLE_GAP}
              r={1.6}
            />
          ))}
          {holeXs.map((x, i) => (
            <circle
              key={`b-${x}`}
              ref={(el) => {
                bottomHoleRefs.current[i] = el;
              }}
              className="ribbonHole"
              cx={x}
              cy={bottomY(x, 0) + HOLE_GAP}
              r={1.6}
            />
          ))}
        </svg>
      </div>
      <div className="filmstripEnds">
        <span>≤ {formatMinutes(low)}</span>
        <span>≥ {formatMinutes(high)}</span>
      </div>
      {hero ? (
        <>
          <p className="runtimeHeroText">La durée moyenne de tes films</p>
          {scale ? (
            <p className="runtimeHeroFifty">(la moyenne sur Fifty est de {formatMinutes(scale.average)})</p>
          ) : null}
        </>
      ) : (
        <>
          <p className="cardDescription">{card.description}</p>
          <p className="dataSource">{card.data_source}</p>
        </>
      )}
    </article>
  );
}
