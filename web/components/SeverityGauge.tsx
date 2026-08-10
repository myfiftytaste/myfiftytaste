import { useEffect, useState } from "react";
import type { Card } from "./ProfileView";

const MAX_ABS_GAP = 1.5;

function formatSignedFrench(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(value);
}

function gaugePosition(value: number) {
  const clamped = Math.max(-MAX_ABS_GAP, Math.min(MAX_ABS_GAP, value));
  return ((clamped + MAX_ABS_GAP) / (MAX_ABS_GAP * 2)) * 100;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function SeverityGauge({ card }: { card?: Card | null }) {
  const rawValue = card?.value != null ? Number.parseFloat(card.value) : NaN;
  const hasValue = Number.isFinite(rawValue);
  const targetPosition = hasValue ? gaugePosition(rawValue) : 50;
  const [markerPosition, setMarkerPosition] = useState(50);

  useEffect(() => {
    if (!hasValue) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMarkerPosition(targetPosition);
      return;
    }

    const duration = 1000;
    const delay = 150;
    let rafId = 0;
    const timeoutId = window.setTimeout(() => {
      const startTime = performance.now();
      function tick(now: number) {
        const t = Math.min(1, (now - startTime) / duration);
        setMarkerPosition(50 + (targetPosition - 50) * easeOutCubic(t));
        if (t < 1) rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
    };
  }, [hasValue, targetPosition]);

  return (
    <div className="severityCard" aria-label="Sévérité de notation">
      {hasValue ? (
        <>
          <p className="severityEyebrow">{card?.title}</p>
          <span className="severityValue">{formatSignedFrench(rawValue)}</span>
          {card?.description ? <p className="severityDesc">{card.description}</p> : null}
          <div className="gauge">
            <div className="gaugeTrack">
              <div className="gaugeCenterTick" aria-hidden="true" />
              <div className="gaugeMarker" style={{ left: `${markerPosition}%` }} />
            </div>
            <div className="gaugeEnds">
              <span>Sévère</span>
              <span>Indulgent</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="severityEyebrow">Notation</p>
          <p className="severityDesc">
            {card?.description ?? "Pas assez de notes comparables pour calculer l’écart à la moyenne."}
          </p>
        </>
      )}
    </div>
  );
}
