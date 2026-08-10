"use client";

import { useEffect, useId, useMemo, useRef } from "react";

type RuntimeCard = {
  title: string;
  value: string | null;
  description: string;
  data_source: string;
};

// Calibrated on the real Megabank runtime distribution (median 99min, mean
// 103min across 9,961 films): the track's center lands on the real catalogue
// average instead of an arbitrary round span.
const RUNTIME_LOW = 60; // 1h
const RUNTIME_HIGH = 150; // 2h30

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
}: {
  card?: RuntimeCard | null;
  averageMinutes?: number | null;
}) {
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
        ? Math.max(0, Math.min(1, ((averageMinutes as number) - RUNTIME_LOW) / (RUNTIME_HIGH - RUNTIME_LOW)))
        : 0,
    [hasData, averageMinutes],
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
      <article className="metricCard" aria-label="Durée moyenne">
        <div className="cardTopline">
          <h3>Durée moyenne</h3>
        </div>
        <p className="cardDescription">Durée moyenne indisponible.</p>
      </article>
    );
  }

  return (
    <article className="metricCard" aria-label={card.title}>
      <div className="cardTopline">
        <h3>{card.title}</h3>
      </div>
      <p className="filmstripValue">{card.value}</p>
      <div className="filmstripVisual">
        <svg viewBox={`0 0 ${W} 70`} role="img" aria-label={card.description}>
          <defs>
            <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="rgba(217,164,65,0.65)" />
              <stop offset="100%" stopColor="#e2b24a" />
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
        <span>1h</span>
        <span>2h30</span>
      </div>
      <p className="cardDescription">{card.description}</p>
      <p className="dataSource">{card.data_source}</p>
    </article>
  );
}
