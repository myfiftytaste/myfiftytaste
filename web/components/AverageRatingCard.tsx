import type { CSSProperties } from "react";

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
  if (typeof average !== "number" || !Number.isFinite(average)) {
    return (
      <section className="averageRatingCard" aria-label="Note moyenne">
        <div className="averageStar empty" aria-hidden="true">
          {"\u2605"}
        </div>
        <div className="averageRatingCopy">
          <span>Note moyenne indisponible</span>
        </div>
      </section>
    );
  }

  const ratingScale = typeof scale === "number" && Number.isFinite(scale) && scale > 0 ? scale : 5;
  const clampedAverage = Math.max(0, Math.min(ratingScale, average));
  const fillPercent = `${(clampedAverage / ratingScale) * 100}%`;
  const formattedAverage = formatFrenchRating(clampedAverage);
  const filmsLabel =
    detectedFilmsCount < 50
      ? `${detectedFilmsCount} derniers films vus`
      : "50 derniers films vus";

  return (
    <section className="averageRatingCard" aria-label="Note moyenne">
      <div
        className="averageStar"
        aria-hidden="true"
        style={{ "--star-fill": fillPercent } as CSSProperties}
      >
        {"\u2605"}
      </div>
      <div className="averageRatingCopy">
        <strong>{formattedAverage}</strong>
        <span>Ta note moyenne sur les {filmsLabel}</span>
      </div>
    </section>
  );
}
