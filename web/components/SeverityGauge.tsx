import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Card } from "./ProfileView";

// Jauge validée le 26/10/2026 : la ligne d'origine, avec deux billes qui roulent depuis leur
// extrémité (la moyenne la plus basse part de la gauche) et s'arrêtent à leur note sur ½–5 :
// dorée = ta moyenne, camaïeu Letterboxd = la communauté sur les mêmes films.
const SCALE_MIN = 0.5;
const SCALE_MAX = 5;
const BALL_SIZE = 16;
const TICKS = [1, 2, 3, 4, 5];

function formatFrench(value: number, signed = false) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(value);
}

function toPercent(value: number) {
  const clamped = Math.max(SCALE_MIN, Math.min(SCALE_MAX, value));
  return ((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
}

function parse(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

export default function SeverityGauge({
  card,
  fallbackAverage,
}: {
  card?: Card | null;
  // Profils générés avant l'ajout des deux moyennes (cache de 24 h au plus) : moyenne générale du profil.
  fallbackAverage?: number | null;
}) {
  const gap = parse(card?.value);
  const you = parse(card?.user_average) ?? (gap !== null ? parse(fallbackAverage) : null);
  const community = parse(card?.community_average) ?? (you !== null && gap !== null ? you - gap : null);
  const hasValue = gap !== null && you !== null && community !== null;
  const trackRef = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(0);
  const [trackWidth, setTrackWidth] = useState(300);

  // L'arrivée des billes se joue la première fois que la jauge entre à l'écran, puis plus.
  useEffect(() => {
    const node = trackRef.current;
    if (!hasValue || !node) return;
    setTrackWidth(node.offsetWidth || 300);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect(); // une seule fois par visite de la page (bug de scroll, 27/10/2026)
        setRun(1);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasValue]);

  if (!hasValue) {
    return (
      <div className="severityCard" aria-label="Sévérité de notation">
        <p className="severityEyebrow">Notation</p>
        <p className="severityDesc">
          {card?.description ?? "On ne trouve pas assez de notes comparables pour calculer ton écart à la moyenne."}
        </p>
      </div>
    );
  }

  const youAt = toPercent(you);
  const communityAt = toPercent(community);
  const youFromLeft = you <= community;
  // Valeurs trop proches : les deux étiquettes s'écartent de part et d'autre de leur milieu.
  const close = Math.abs(youAt - communityAt) < 12;
  const middle = (youAt + communityAt) / 2;
  const ball = (to: number, fromLeft: boolean, delay: number) => {
    const from = fromLeft ? 0 : 100;
    const spin = (((to - from) / 100) * trackWidth * 360) / (Math.PI * BALL_SIZE);
    return {
      "--from": `${from}%`,
      "--to": `${to}%`,
      "--spin": `${Math.round(spin)}deg`,
      "--delay": `${delay}s`,
    } as CSSProperties;
  };
  const label = (at: number, isLower: boolean) =>
    (close
      ? { left: `${middle}%`, transform: isLower ? "translateX(calc(-100% - 4px))" : "translateX(4px)" }
      : { left: `${at}%`, transform: "translateX(-50%)" }) as CSSProperties;

  return (
    <div className="severityCard" aria-label="Sévérité de notation">
      <div className="severityHead">
        <p className="severityEyebrow">{card?.title}</p>
        <span className="severityValue">{formatFrench(gap, true)}</span>
      </div>
      {card?.description ? <p className="severityDesc">{card.description}</p> : null}
      <div
        className="gaugeBalls"
        ref={trackRef}
        role="img"
        aria-label={`Ta moyenne ${formatFrench(you)}, moyenne de la communauté Letterboxd sur les mêmes films ${formatFrench(community)}`}
      >
        {/* Rien n'est dessiné avant la première apparition à l'écran : l'arrivée des billes se voit toujours. */}
        <div key={run} className="gaugeBallsStage" style={{ visibility: run === 0 ? "hidden" : "visible" }}>
          <div className="gaugeBallsTrack" />
          <div
            className="gaugeBallsSpan"
            style={{ left: `${Math.min(youAt, communityAt)}%`, width: `${Math.abs(communityAt - youAt)}%` }}
          />
          {TICKS.map((tick) => (
            <span key={tick} className="gaugeBallsTick" style={{ left: `${toPercent(tick)}%` }}>
              {tick}
            </span>
          ))}
          <span className="gaugeBallsValue gaugeBallsValueYou" style={label(youAt, youFromLeft)}>
            {formatFrench(you)}
          </span>
          <span className="gaugeBallsValue" style={label(communityAt, !youFromLeft)}>
            {formatFrench(community)}
          </span>
          <span className="gaugeBall gaugeBallYou" style={ball(youAt, youFromLeft, 0.2)} />
          <span className="gaugeBall gaugeBallCommunity" style={ball(communityAt, !youFromLeft, 0.35)} />
        </div>
      </div>
      <ul className="gaugeBallsLegend">
        <li>
          <span className="gaugeDot gaugeBallYou" aria-hidden="true" />
          <span>
            <b>{formatFrench(you)}</b>{" "}
            {card?.compared_count ? `(ta moyenne sur ${card.compared_count} films)` : "(ta moyenne)"}
          </span>
        </li>
        <li>
          <span className="gaugeDot gaugeBallCommunity" aria-hidden="true" />
          <span>
            <b>{formatFrench(community)}</b> (la moyenne de la communauté Letterboxd sur les mêmes films)
          </span>
        </li>
      </ul>
      {card?.compared_count && card.rated_count && card.rated_count > card.compared_count ? (
        <p className="severityDesc">
          Comparaison sur {card.compared_count} de tes {card.rated_count} films notés :{" "}
          {card.rated_count - card.compared_count === 1
            ? "l’autre n’a pas encore de moyenne Letterboxd dans Fifty."
            : `les ${card.rated_count - card.compared_count} autres n’ont pas encore de moyenne Letterboxd dans Fifty.`}
        </p>
      ) : null}
    </div>
  );
}
