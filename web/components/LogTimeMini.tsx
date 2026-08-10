"use client";

import { useEffect, useRef } from "react";

type LogTimeProfile = {
  average_time?: string | null;
  average_hour_decimal?: number | null;
  data_source?: string | null;
};

const CX = 100;
const CY = 70;
const R = 62;

function polarToPoint(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angle = (angleDegrees * Math.PI) / 180;
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function visualHour(hourDecimal: number) {
  const normalized = ((hourDecimal % 24) + 24) % 24;
  return normalized < 5 ? normalized + 24 : normalized;
}

function progressForHour(hourDecimal: number) {
  return Math.max(0, Math.min(1, (visualHour(hourDecimal) - 5) / 20));
}

function pointForFraction(fraction: number) {
  const angle = 200 + fraction * 140;
  return polarToPoint(CX, CY, R, angle);
}

function periodCopy(hourDecimal: number) {
  const hour = visualHour(hourDecimal) % 24;
  if (hour >= 5 && hour < 12) {
    return { label: "Matinée", description: "Tes films sont surtout loggés le matin." };
  }
  if (hour >= 12 && hour < 18) {
    return { label: "Après-midi", description: "Tes films sont surtout loggés l’après-midi." };
  }
  if (hour >= 18 && hour < 23) {
    return { label: "Soirée", description: "Tes films sont surtout loggés en soirée." };
  }
  return { label: "Nuit", description: "Tes films sont surtout loggés la nuit." };
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function LogTimeMini({ logTimeProfile }: { logTimeProfile?: LogTimeProfile | null }) {
  const cardRef = useRef<HTMLElement>(null);
  const markerOuterRef = useRef<SVGCircleElement>(null);
  const markerInnerRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGPathElement>(null);

  const hourDecimal = logTimeProfile?.average_hour_decimal;
  const hasData =
    typeof hourDecimal === "number" && Number.isFinite(hourDecimal) && !!logTimeProfile?.average_time;
  const targetFraction = hasData ? progressForHour(hourDecimal as number) : 0;

  useEffect(() => {
    if (!hasData) return;
    const node = cardRef.current;
    if (!node) return;

    function setFraction(fraction: number) {
      const p = pointForFraction(fraction);
      markerOuterRef.current?.setAttribute("cx", String(p.x));
      markerOuterRef.current?.setAttribute("cy", String(p.y));
      markerInnerRef.current?.setAttribute("cx", String(p.x));
      markerInnerRef.current?.setAttribute("cy", String(p.y));
      glowRef.current?.setAttribute("stroke-dasharray", `${fraction * 100} 100`);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFraction(targetFraction);
      return;
    }

    setFraction(0);
    let rafId = 0;
    // Replays every time the card re-enters view, not just once: scrolling
    // away and back should show the reveal again.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          cancelAnimationFrame(rafId);
          setFraction(0);
          const duration = 1200;
          const startTime = performance.now();
          function tick(now: number) {
            const t = Math.max(0, Math.min(1, (now - startTime) / duration));
            setFraction(easeOutCubic(t) * targetFraction);
            if (t < 1) rafId = requestAnimationFrame(tick);
          }
          rafId = requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [hasData, targetFraction]);

  if (!hasData) {
    return (
      <article className="metricCard" aria-label="Heure de log">
        <div className="cardTopline">
          <h3>Heure de log</h3>
        </div>
        <p className="cardDescription">Heure de log indisponible.</p>
      </article>
    );
  }

  const start = pointForFraction(0);
  const end = pointForFraction(1);
  const period = periodCopy(hourDecimal as number);
  const rawHour = ((hourDecimal as number) % 24 + 24) % 24;
  const isNight = rawHour >= 18.5 || rawHour < 6.5;
  const iconX = CX;
  const iconY = CY - 8;

  return (
    <article className="metricCard" aria-label="Heure de log" ref={cardRef}>
      <div className="cardTopline">
        <h3>Heure de log</h3>
      </div>
      <div className="logTimeMiniRow">
        <div className="logTimeMiniArc">
          <svg
            viewBox="0 0 200 96"
            role="img"
            aria-label={`Heure moyenne de log : ${logTimeProfile?.average_time}`}
          >
            <path
              className="arcTrack"
              d={`M ${start.x} ${start.y} A ${R} ${R} 0 0 1 ${end.x} ${end.y}`}
              pathLength={100}
            />
            <path
              ref={glowRef}
              className="arcGlow"
              d={`M ${start.x} ${start.y} A ${R} ${R} 0 0 1 ${end.x} ${end.y}`}
              pathLength={100}
              strokeDasharray="0 100"
            />
            {isNight ? (
              <path
                className="moonIcon"
                d={`M ${iconX} ${iconY - 7} A 7 7 0 1 0 ${iconX} ${iconY + 7} A 5 5 0 1 1 ${iconX} ${iconY - 7}`}
              />
            ) : (
              <g className="sunIcon">
                <circle cx={iconX} cy={iconY} r={4} />
                {[0, 60, 120, 180, 240, 300].map((a) => {
                  const inner = polarToPoint(iconX, iconY, 6.5, a);
                  const outer = polarToPoint(iconX, iconY, 9.5, a);
                  return <line key={a} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
                })}
              </g>
            )}
            <circle ref={markerOuterRef} className="arcMarkerOuter" cx={start.x} cy={start.y} r={8} />
            <circle ref={markerInnerRef} className="arcMarkerInner" cx={start.x} cy={start.y} r={3} />
          </svg>
        </div>
        <div className="logTimeMiniBody">
          <p className="logTimeMiniValue">{logTimeProfile?.average_time?.replace(":", "h")}</p>
          <p className="logTimeMiniLabel">{period.label}</p>
          <p className="logTimeMiniDesc">{period.description}</p>
        </div>
      </div>
      <p className="dataSource">{logTimeProfile?.data_source}</p>
    </article>
  );
}
