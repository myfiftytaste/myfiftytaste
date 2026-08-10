import { useEffect, useId, useRef } from "react";

const STAR_POINTS =
  "50,4 60.58,35.44 93.75,35.79 67.12,55.56 77.04,87.21 50,68 22.96,87.21 32.88,55.56 6.25,35.79 39.42,35.44";

function formatFrenchRating(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function AverageRatingCard({
  average,
  scale = 5,
  detectedFilmsCount,
}: {
  average?: number | null;
  scale?: number | null;
  detectedFilmsCount: number;
}) {
  const clipId = useId();
  const clipRectRef = useRef<SVGRectElement>(null);

  const ratingScale = typeof scale === "number" && Number.isFinite(scale) && scale > 0 ? scale : 5;
  const clampedAverage =
    typeof average === "number" && Number.isFinite(average) ? Math.max(0, Math.min(ratingScale, average)) : 0;
  const fillPercent = (clampedAverage / ratingScale) * 100;

  useEffect(() => {
    if (typeof average !== "number" || !Number.isFinite(average)) return;
    const rect = clipRectRef.current;
    if (!rect) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      rect.setAttribute("width", String(fillPercent));
      return;
    }

    const duration = 1100;
    const delay = 150;
    let rafId = 0;
    const timeoutId = window.setTimeout(() => {
      const startTime = performance.now();
      function tick(now: number) {
        const t = Math.min(1, (now - startTime) / duration);
        rect?.setAttribute("width", String(easeOutCubic(t) * fillPercent));
        if (t < 1) rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
    };
  }, [average, fillPercent]);

  if (typeof average !== "number" || !Number.isFinite(average)) {
    return (
      <section className="averageRatingCard" aria-label="Note moyenne">
        <svg className="averageStarSvg empty" viewBox="0 0 100 100" aria-hidden="true">
          <polygon className="starBase" points={STAR_POINTS} />
        </svg>
        <div className="averageRatingCopy">
          <span>Note moyenne indisponible</span>
        </div>
      </section>
    );
  }

  const formattedAverage = formatFrenchRating(clampedAverage);
  const filmsLabel =
    detectedFilmsCount < 50
      ? `${detectedFilmsCount} derniers films vus`
      : "50 derniers films vus";

  return (
    <section className="averageRatingCard" aria-label="Note moyenne">
      <svg className="averageStarSvg" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <rect ref={clipRectRef} x="0" y="0" width="0" height="100" />
          </clipPath>
        </defs>
        <polygon className="starBase" points={STAR_POINTS} />
        <polygon className="starFill" points={STAR_POINTS} clipPath={`url(#${clipId})`} />
      </svg>
      <div className="averageRatingCopy">
        <strong>{formattedAverage}</strong>
        <span>Ta note moyenne sur les {filmsLabel}</span>
      </div>
    </section>
  );
}
