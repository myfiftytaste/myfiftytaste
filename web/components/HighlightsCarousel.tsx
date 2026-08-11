"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";

type FilmHighlight = {
  title: string | null;
  rss_title: string | null;
  slug: string | null;
  url: string | null;
  source: string | null;
  director?: string | null;
  directors?: string[];
  poster_url?: string | null;
  backdrop_url?: string | null;
  poster_status?: "verified" | "ambiguous" | "missing" | string | null;
  value_label?: string | null;
};

type DirectorHighlight = {
  director: string;
  count: number;
  director_slug?: string | null;
  letterboxd_url?: string | null;
  films?: {
    title?: string | null;
    slug?: string | null;
    year?: number | null;
  }[];
};

export type Highlights = {
  most_niche: FilmHighlight | null;
  most_mainstream: FilmHighlight | null;
  best_rated: FilmHighlight | null;
  worst_rated: FilmHighlight | null;
  longest: FilmHighlight | null;
  shortest: FilmHighlight | null;
  most_repeated_director: DirectorHighlight | null;
};

type HighlightsCopy = {
  eyebrow?: string;
  title?: string;
  labels?: Record<string, string>;
};

function DirectorIcon() {
  return (
    <svg viewBox="0 0 48 48" className="highlightDirectorIcon" aria-hidden="true">
      <rect x="6" y="18" width="36" height="22" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path
        d="M6 18L9.5 8h6.5l-3.5 10H6zM19 18l3.5-10h6.5L25 18h-6zM32 18l3.5-10H40a2 2 0 0 1 2 2v8H32z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="6" y1="18" x2="42" y2="18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CardFace({
  label,
  title,
  subtitle,
  posterUrl,
  hasPoster,
  isDirector,
}: {
  label: string;
  title: string;
  subtitle: string | null;
  posterUrl: string | null;
  hasPoster: boolean;
  isDirector?: boolean;
}) {
  return (
    <>
      {hasPoster && posterUrl ? (
        <img className="highlight3dPoster" src={posterUrl} alt="" loading="lazy" draggable={false} />
      ) : (
        <div className="highlight3dPoster highlight3dPosterFallback" aria-hidden="true">
          {isDirector ? <DirectorIcon /> : <span>{title.slice(0, 1)}</span>}
        </div>
      )}
      <div className="highlight3dOverlay">
        <span className="highlight3dLabel">{label}</span>
        <strong className="highlight3dTitle">{title}</strong>
        {subtitle ? <span className="highlight3dSubtitle">{subtitle}</span> : null}
      </div>
    </>
  );
}

// Shortest signed offset (in slide units) from the current active slide to a
// given absolute index, e.g. with 7 slides, index 6 seen from active 0 is -1
// (one step back) rather than +6 (six steps forward around the ring).
function shortestOffset(fromIndex: number, toIndex: number, count: number): number {
  const raw = toIndex - fromIndex;
  return ((raw + count / 2 + count) % count) - count / 2;
}

export default function HighlightsCarousel({
  highlights,
  copy,
}: {
  highlights: Highlights;
  copy?: HighlightsCopy;
}) {
  // `step` is an unbounded counter (never wrapped) so the ring always keeps
  // spinning the same direction on repeated clicks instead of occasionally
  // snapping backwards when the active index wraps from last to first.
  const [step, setStep] = useState(0);

  const labels = copy?.labels ?? {};

  const slides = useMemo(() => {
    const items: {
      key: string;
      href: string | null;
      label: string;
      title: string;
      subtitle: string | null;
      posterUrl: string | null;
      hasPoster: boolean;
      isDirector?: boolean;
    }[] = [];

    const pushFilm = (key: keyof Highlights, defaultLabel: string) => {
      const item = highlights[key] as FilmHighlight | null;
      const title = item?.title || item?.rss_title || "Indisponible";
      items.push({
        key,
        href: item?.url ?? null,
        label: labels[key] ?? defaultLabel,
        title,
        subtitle: item?.value_label ?? item?.director ?? null,
        posterUrl: item?.poster_url ?? null,
        hasPoster: item?.poster_status === "verified" && Boolean(item?.poster_url),
      });
    };

    pushFilm("most_niche", "Le plus niche");
    pushFilm("most_mainstream", "Le plus mainstream");
    pushFilm("best_rated", "Le mieux noté");
    pushFilm("worst_rated", "Le moins bien noté");
    pushFilm("longest", "Le plus long");
    pushFilm("shortest", "Le plus court");

    const director = highlights.most_repeated_director;
    const films = director?.films ?? [];
    const filmNames = films.slice(0, 2).map((film) => film.title).filter(Boolean);
    items.push({
      key: "most_repeated_director",
      href: director?.letterboxd_url ?? null,
      label: labels.most_repeated_director ?? "Ta réalisatrice récurrente / Ton réalisateur récurrent",
      title: director?.director ?? "Indisponible",
      subtitle: filmNames.length ? filmNames.join(" · ") : director ? `${director.count} films` : null,
      posterUrl: null,
      hasPoster: false,
      isDirector: true,
    });

    return items;
  }, [highlights, labels]);

  const count = slides.length;
  const segmentAngle = 360 / count;
  const activeIndex = ((step % count) + count) % count;

  function goByOffset(offset: number) {
    setStep((current) => current + offset);
  }

  function goToIndex(index: number) {
    goByOffset(shortestOffset(activeIndex, index, count));
  }

  return (
    <div className="highlightsCarousel">
      <div className="highlights3dStage">
        <button
          type="button"
          className="highlightsArrow highlights3dArrowPrev"
          aria-label="Précédent"
          onClick={() => goByOffset(-1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14.5 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="highlights3dViewport">
          <div className="highlights3dRing" style={{ transform: `rotateY(${-step * segmentAngle}deg)` }}>
            {slides.map((slide, index) => {
              const relative = shortestOffset(activeIndex, index, count);
              const rad = (relative * segmentAngle * Math.PI) / 180;
              const depth = Math.cos(rad);
              const isActive = index === activeIndex;
              const opacity = Math.max(0, Math.min(1, (depth + 0.35) / 1.35));
              const scale = 0.68 + 0.22 * Math.max(0, depth);
              const cardContent = (
                <CardFace
                  label={slide.label}
                  title={slide.title}
                  subtitle={slide.subtitle}
                  posterUrl={slide.posterUrl}
                  hasPoster={slide.hasPoster}
                  isDirector={slide.isDirector}
                />
              );

              return (
                <div
                  className="highlights3dItem"
                  key={slide.key}
                  style={{
                    transform: `rotateY(${index * segmentAngle}deg) translateZ(var(--carousel-radius)) scale(${scale})`,
                    opacity,
                    zIndex: Math.round((depth + 1) * 100),
                    pointerEvents: opacity < 0.15 ? "none" : "auto",
                  }}
                  onClickCapture={(event) => {
                    if (!isActive) {
                      event.preventDefault();
                      event.stopPropagation();
                      goToIndex(index);
                    }
                  }}
                >
                  {slide.href ? (
                    <a
                      className={`highlights3dCard${isActive ? " isActive" : ""}`}
                      href={slide.href}
                      target="_blank"
                      rel="noreferrer"
                      draggable={false}
                      tabIndex={isActive ? 0 : -1}
                    >
                      {cardContent}
                    </a>
                  ) : (
                    <div className={`highlights3dCard${isActive ? " isActive" : ""}`}>{cardContent}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="highlightsArrow highlights3dArrowNext"
          aria-label="Suivant"
          onClick={() => goByOffset(1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9.5 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="highlights3dDots">
        {slides.map((slide, index) => (
          <button
            key={slide.key}
            type="button"
            className={`highlights3dDot${index === activeIndex ? " isActive" : ""}`}
            aria-label={slide.label}
            onClick={() => goToIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
