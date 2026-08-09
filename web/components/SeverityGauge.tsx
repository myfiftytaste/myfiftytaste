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

export default function SeverityGauge({ card }: { card?: Card | null }) {
  const rawValue = card?.value != null ? Number.parseFloat(card.value) : NaN;
  const hasValue = Number.isFinite(rawValue);

  return (
    <div className="severityCard" aria-label="Sévérité de notation">
      <p className="severityEyebrow">Sévérité</p>
      {hasValue ? (
        <>
          <div className="severityHead">
            <span className="severityValue">{formatSignedFrench(rawValue)}</span>
            <span className="severityLabel">{card?.title}</span>
          </div>
          {card?.description ? <p className="severityDesc">{card.description}</p> : null}
          <div className="gauge">
            <div className="gaugeTrack">
              <div className="gaugeCenterTick" aria-hidden="true" />
              <div className="gaugeMarker" style={{ left: `${gaugePosition(rawValue)}%` }} />
            </div>
            <div className="gaugeEnds">
              <span>Sévère</span>
              <span>Indulgent</span>
            </div>
          </div>
        </>
      ) : (
        <p className="severityDesc">
          {card?.description ?? "Pas assez de notes comparables pour calculer l’écart à la moyenne."}
        </p>
      )}
    </div>
  );
}
