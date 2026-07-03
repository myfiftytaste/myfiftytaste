type LogTimeProfile = {
  average_time?: string | null;
  average_hour_decimal?: number | null;
  period?: string | null;
  label?: string | null;
  description?: string | null;
  data_source?: string | null;
  confidence?: string | null;
};

function polarToPoint(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angle = (angleDegrees * Math.PI) / 180;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function visualHour(hourDecimal: number) {
  const normalized = ((hourDecimal % 24) + 24) % 24;
  return normalized < 5 ? normalized + 24 : normalized;
}

function progressForHour(hourDecimal: number) {
  return Math.max(0, Math.min(1, (visualHour(hourDecimal) - 5) / 20));
}

function pointForHour(hourDecimal: number) {
  const angle = 200 + progressForHour(hourDecimal) * 140;
  return polarToPoint(260, 260, 170, angle);
}

function logTimeCopy(profile: LogTimeProfile) {
  const hour = visualHour(profile.average_hour_decimal ?? 0) % 24;
  if (hour >= 5 && hour < 12) {
    return {
      label: "Séance matinale",
      description: "Tes films sont surtout loggés le matin.",
    };
  }
  if (hour >= 12 && hour < 18) {
    return {
      label: "Séance d’après-midi",
      description: "Tes films sont surtout loggés l’après-midi.",
    };
  }
  if (hour >= 18 && hour < 23) {
    return {
      label: "Séance du soir",
      description: "Tes films sont surtout loggés en soirée.",
    };
  }
  return {
    label: "Séance nocturne",
    description: "Tes films sont surtout loggés la nuit.",
  };
}

function timeLabel(profile?: LogTimeProfile) {
  if (!profile?.average_time) {
    return "Heure moyenne indisponible";
  }
  return `Ton heure moyenne de log est : ${profile.average_time}`;
}

function centerTimeLabel(profile: LogTimeProfile) {
  return (profile.average_time ?? "").replace(":", "h");
}

export default function LogTimeArc({ logTimeProfile }: { logTimeProfile?: LogTimeProfile | null }) {
  if (!logTimeProfile?.average_time || typeof logTimeProfile.average_hour_decimal !== "number") {
    return (
      <section className="log-time-section" aria-label="Heure de log">
        <div className="sectionHeading">
          <p className="eyebrow">HEURE DE LOG</p>
          <h2>Plutôt du genre séance nocturne ou matinale ?</h2>
        </div>
        <div className="log-time-unavailable">Heure de log indisponible</div>
      </section>
    );
  }

  const marker = pointForHour(logTimeProfile.average_hour_decimal);
  const activeProgress = progressForHour(logTimeProfile.average_hour_decimal) * 100;
  const copy = logTimeCopy(logTimeProfile);
  const centerTime = centerTimeLabel(logTimeProfile);
  const markers = [
    { label: "MATIN", detail: "05:00", point: pointForHour(5) },
    { label: "APRÈS-MIDI", detail: "14:00", point: pointForHour(14) },
    { label: "SOIR", detail: "20:00", point: pointForHour(20) },
    { label: "NUIT", detail: "01:00", point: pointForHour(1) },
  ];

  return (
    <section className="log-time-section" aria-label="Heure de log">
      <div className="sectionHeading">
        <p className="eyebrow">HEURE DE LOG</p>
        <h2>Plutôt du genre séance nocturne ou matinale ?</h2>
      </div>

      <div className="log-time-card">
        <div className="log-time-visual">
          <svg viewBox="0 0 520 325" role="img" aria-label={timeLabel(logTimeProfile)}>
            <path
              className="log-time-track"
              d="M 100 202 A 170 170 0 0 1 420 202"
              pathLength="100"
            />
            <path
              className="log-time-glow"
              d="M 100 202 A 170 170 0 0 1 420 202"
              pathLength="100"
              style={{ strokeDasharray: `${activeProgress} 100` }}
            />
            <g className="log-time-sun" aria-hidden="true">
              <circle cx="48" cy="202" r="9" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                const inner = polarToPoint(48, 202, 14, angle);
                const outer = polarToPoint(48, 202, 20, angle);
                return (
                  <line
                    key={angle}
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                  />
                );
              })}
            </g>
            <path
              className="log-time-moon"
              aria-hidden="true"
              d="M 474 186 A 18 18 0 1 0 474 218 A 13 13 0 1 1 474 186"
            />
            <text className="log-time-center" x="260" y="238" textAnchor="middle">
              {centerTime}
            </text>
            {markers.map((markerItem) => (
              <g key={markerItem.label}>
                <circle
                  className="log-time-tick"
                  cx={markerItem.point.x}
                  cy={markerItem.point.y}
                  r="4"
                />
                <text
                  className="log-time-tick-label"
                  x={markerItem.point.x}
                  y={markerItem.point.y + 24}
                  textAnchor="middle"
                >
                  {markerItem.label}
                </text>
                <text
                  className="log-time-tick-detail"
                  x={markerItem.point.x}
                  y={markerItem.point.y + 39}
                  textAnchor="middle"
                >
                  {markerItem.detail}
                </text>
              </g>
            ))}
            <g className="log-time-marker">
              <circle cx={marker.x} cy={marker.y} r="12" />
              <circle cx={marker.x} cy={marker.y} r="4" />
            </g>
          </svg>
        </div>

        <div className="log-time-copy">
          <p className="log-time-average">{timeLabel(logTimeProfile)}</p>
          <strong>{copy.label}</strong>
          <p>{copy.description}</p>
        </div>
      </div>
    </section>
  );
}
