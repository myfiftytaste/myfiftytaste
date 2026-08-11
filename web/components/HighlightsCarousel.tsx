"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

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

function HighlightItem({ label, item }: { label: string; item: FilmHighlight | null }) {
  const title = item?.title || item?.rss_title || "Unavailable";
  const hasVerifiedPoster = item?.poster_status === "verified" && item?.poster_url;
  const content = (
    <>
      {hasVerifiedPoster ? (
        <img className="highlightPoster" src={item.poster_url ?? ""} alt="" loading="lazy" />
      ) : (
        <div className="highlightPoster highlightPosterFallback" aria-hidden="true">
          <span>{title.slice(0, 1)}</span>
        </div>
      )}
      <div className="highlightText">
        <span>{label}</span>
        <div className="highlightMain">
          <strong>{title}</strong>
          {item?.value_label ? (
            <small className="highlightValue">{item.value_label}</small>
          ) : (
            <small className={item?.director ? undefined : "highlightMetaMuted"}>
              {item?.director || "Réalisateur non renseigné"}
            </small>
          )}
        </div>
      </div>
    </>
  );

  if (item?.url) {
    return (
      <a className="highlightItem" href={item.url} target="_blank" rel="noreferrer" draggable={false}>
        {content}
      </a>
    );
  }

  return <div className="highlightItem">{content}</div>;
}

function DirectorHighlightItem({ label, item }: { label: string; item: DirectorHighlight | null }) {
  const films = item?.films ?? [];
  const filmNames = films.slice(0, 3).map((film) => film.title).filter(Boolean);
  const suffix = films.length > 3 ? " · …" : "";
  const content = (
    <>
      <div className="highlightPoster highlightPosterFallback" aria-hidden="true">
        <DirectorIcon />
      </div>
      <div className="highlightText">
        <span>{label}</span>
        <div className="highlightMain">
          <strong>{item?.director ?? "Unavailable"}</strong>
          <small>{filmNames.length ? `${filmNames.join(" · ")}${suffix}` : `${item?.count ?? 0} films`}</small>
        </div>
      </div>
    </>
  );

  if (item?.letterboxd_url) {
    return (
      <a
        className="highlightItem highlightDirectorItem"
        href={item.letterboxd_url}
        target="_blank"
        rel="noreferrer"
        draggable={false}
      >
        {content}
      </a>
    );
  }

  return <div className="highlightItem highlightDirectorItem">{content}</div>;
}

export default function HighlightsCarousel({
  highlights,
  copy,
}: {
  highlights: Highlights;
  copy?: HighlightsCopy;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  const [isDragging, setIsDragging] = useState(false);

  const labels = copy?.labels ?? {};

  function scrollByAmount(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: track.clientWidth * 0.82 * direction, behavior: "smooth" });
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const track = trackRef.current;
    if (!track) return;
    dragState.current = { isDown: true, startX: event.clientX, scrollLeft: track.scrollLeft, moved: false };
    track.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const track = trackRef.current;
    const state = dragState.current;
    if (!state.isDown || !track) return;
    const delta = event.clientX - state.startX;
    if (Math.abs(delta) > 4) {
      state.moved = true;
    }
    track.scrollLeft = state.scrollLeft - delta;
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const track = trackRef.current;
    if (track && dragState.current.isDown) {
      track.releasePointerCapture(event.pointerId);
    }
    dragState.current.isDown = false;
    setIsDragging(false);
  }

  function onClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (dragState.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      dragState.current.moved = false;
    }
  }

  const slides: { key: string; node: JSX.Element }[] = [
    {
      key: "most_niche",
      node: <HighlightItem label={labels.most_niche ?? "Le plus niche"} item={highlights.most_niche} />,
    },
    {
      key: "most_mainstream",
      node: (
        <HighlightItem label={labels.most_mainstream ?? "Le plus mainstream"} item={highlights.most_mainstream} />
      ),
    },
    {
      key: "best_rated",
      node: <HighlightItem label={labels.best_rated ?? "Le mieux noté"} item={highlights.best_rated} />,
    },
    {
      key: "worst_rated",
      node: <HighlightItem label={labels.worst_rated ?? "Le moins bien noté"} item={highlights.worst_rated} />,
    },
    {
      key: "longest",
      node: <HighlightItem label={labels.longest ?? "Le plus long"} item={highlights.longest} />,
    },
    {
      key: "shortest",
      node: <HighlightItem label={labels.shortest ?? "Le plus court"} item={highlights.shortest} />,
    },
    {
      key: "most_repeated_director",
      node: (
        <DirectorHighlightItem
          label={labels.most_repeated_director ?? "Ta réalisatrice récurrente / Ton réalisateur récurrent"}
          item={highlights.most_repeated_director}
        />
      ),
    },
  ];

  return (
    <div className="highlightsCarousel">
      <div
        className={`highlightsTrack${isDragging ? " isDragging" : ""}`}
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
      >
        {slides.map((slide) => (
          <div className="highlightSlide" key={slide.key}>
            {slide.node}
          </div>
        ))}
      </div>
      <div className="highlightsControls">
        <button
          type="button"
          className="highlightsArrow"
          aria-label="Précédent"
          onClick={() => scrollByAmount(-1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14.5 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          className="highlightsArrow highlightsArrowNext"
          aria-label="Suivant"
          onClick={() => scrollByAmount(1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9.5 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
