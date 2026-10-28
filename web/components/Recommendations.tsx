"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { countryFr, genreFr } from "../lib/labelsFr";

type Recommendation = {
  slot: "safe_pick" | "deep_cut" | "wild_card" | string;
  title: string;
  year: number | null;
  slug: string;
  letterboxd_url?: string | null;
  score: number;
  reason_text: string;
  genres?: string[];
  countries?: string[];
  runtime?: number | null;
  average_rating?: number | null;
  director?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  poster_status?: "verified" | "ambiguous" | "missing" | string | null;
};

type RecommendationsCopy = {
  eyebrow?: string;
  title?: string;
  subtitle_template?: string;
  unavailable_text?: string;
  slot_labels?: Record<string, string>;
  slot_descriptions?: Record<string, string>;
};

function metaList(values: string[] | undefined, limit = 3) {
  return (values ?? []).slice(0, limit).join(" · ");
}

function Poster({ recommendation }: { recommendation: Recommendation }) {
  if (recommendation.poster_status === "verified" && recommendation.poster_url) {
    return (
      <img
        className="recommendation-poster"
        src={recommendation.poster_url}
        alt=""
        loading="lazy"
      />
    );
  }

  return (
    <div className="recommendation-poster recommendation-poster-fallback" aria-hidden="true">
      <span>{recommendation.title?.slice(0, 1) || "?"}</span>
    </div>
  );
}

export default function Recommendations({
  recommendations,
  detectedFilmsCount = 50,
  unavailableReason,
  copy,
}: {
  recommendations?: Recommendation[];
  detectedFilmsCount?: number;
  unavailableReason?: string | null;
  copy?: RecommendationsCopy;
}) {
  const title = copy?.title ?? "Les Recos";
  const subtitle =
    copy?.subtitle_template?.replace("{detected_films_count}", String(detectedFilmsCount)) ??
    `Des recommandations calculées à partir de tes ${detectedFilmsCount} films détectés. Et tout ça sans IA !`;
  const unavailableText = copy?.unavailable_text ?? "On ne trouve pas de recommandations pour ce profil.";
  const slotLabels = copy?.slot_labels ?? {};
  const slotDescriptions = copy?.slot_descriptions ?? {};
  const [flipped, setFlipped] = useState<string[]>([]);

  if (!recommendations || recommendations.length === 0) {
    if (!unavailableReason) {
      return null;
    }
    return (
      <section className="recommendations-section" aria-label={title}>
        <div className="sectionHeading">
          <h2>{title}</h2>
          <p>{unavailableText}</p>
        </div>
        <div className="recommendations-unavailable">
          <p>{unavailableReason}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="recommendations-section" aria-label={title}>
      <div className="sectionHeading">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="recommendations-grid">
        {recommendations.map((recommendation) => {
          const isFlipped = flipped.includes(recommendation.slot);
          const slotLabel = slotLabels[recommendation.slot] ?? recommendation.slot;
          const meta = [metaList(recommendation.genres?.map(genreFr), 2), metaList(recommendation.countries?.map((name) => countryFr(name)), 1)].filter(Boolean).join(" · ");
          const front = (
            <>
              <Poster recommendation={recommendation} />
              <div className="recommendation-overlay">
                <span className="recommendation-slot">{slotLabel}</span>
                <h3>
                  {recommendation.title}
                  {recommendation.year ? <em>{recommendation.year}</em> : null}
                </h3>
                {recommendation.director ? <p className="recommendation-director">Réalisé par {recommendation.director}</p> : null}
                {meta ? <p className="recommendation-meta">{meta}</p> : null}
              </div>
            </>
          );

          return (
            <div className={`recommendation-flip${isFlipped ? " is-flipped" : ""}`} key={recommendation.slot}>
              <div className="recommendation-flip-inner">
                <button
                  type="button"
                  className="recommendation-face recommendation-back"
                  aria-hidden={isFlipped}
                  tabIndex={isFlipped ? -1 : 0}
                  onClick={(event) => {
                    setFlipped((current) => [...current, recommendation.slot]);
                    // Le bouton devient masqué : le focus clavier passe à la face révélée.
                    (event.currentTarget.nextElementSibling as HTMLElement | null)?.focus({ preventScroll: true });
                  }}
                >
                  <span className="recommendation-slot">{slotLabel}</span>
                  <span className="recommendation-back-text">
                    {slotDescriptions[recommendation.slot] ?? recommendation.reason_text}
                  </span>
                  <span className="recommendation-back-hint">
                    <span className="verbPointer">Clique</span>
                    <span className="verbTouch">Appuie</span> pour retourner la carte
                  </span>
                </button>
                {recommendation.letterboxd_url ? (
                  <a
                    className="recommendation-face recommendation-front"
                    href={recommendation.letterboxd_url}
                    rel="noreferrer"
                    target="_blank"
                    aria-hidden={!isFlipped}
                    tabIndex={isFlipped ? 0 : -1}
                  >
                    {front}
                  </a>
                ) : (
                  <article className="recommendation-face recommendation-front" aria-hidden={!isFlipped}>
                    {front}
                  </article>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
