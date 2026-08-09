import { useId } from "react";

const STAR_POINTS =
  "50,4 60.58,35.44 93.75,35.79 67.12,55.56 77.04,87.21 50,68 22.96,87.21 32.88,55.56 6.25,35.79 39.42,35.44";

function formatFrenchRating(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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

  const ratingScale = typeof scale === "number" && Number.isFinite(scale) && scale > 0 ? scale : 5;
  const clampedAverage = Math.max(0, Math.min(ratingScale, average));
  const fillPercent = (clampedAverage / ratingScale) * 100;
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
            <rect x="0" y="0" width={fillPercent} height="100" />
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
