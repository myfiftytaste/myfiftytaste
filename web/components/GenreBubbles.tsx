"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { CSSProperties } from "react";
import { genreFr } from "../lib/labelsFr";
import { letterboxdFilmUrl, usePinned } from "../lib/usePinned";

type GenreBubble = {
  genre: string;
  count: number;
  share: number | null;
  size: number;
  average_user_rating?: number | null;
  average_community_rating?: number | null;
  rating_gap?: number | null;
  films?: {
    title?: string | null;
    year?: number | string | null;
    slug?: string | null;
  }[];
};

function formatShare(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return `${Math.round(value * 100)}%`;
}

// Bulles qui se chevauchent (refonte design, 27/10/2026), un peu desserrées le 28/10.
const bubblePositions = [
  { x: "39%", y: "52%", z: 8 },
  { x: "63%", y: "34%", z: 7 },
  { x: "64%", y: "63%", z: 6 },
  { x: "31%", y: "25%", z: 5 },
  { x: "53%", y: "79%", z: 4 },
  { x: "79%", y: "49%", z: 3 },
  { x: "25%", y: "70%", z: 2 },
  { x: "50%", y: "23%", z: 1 },
];

// Couleurs de l'ambiance, choisies pour que deux bulles voisines ne se ressemblent pas ;
// une bulle et sa barre partagent la même.
const bubbleColors = ["accent", "accent-2", "accent-3", "accent-bright", "accent-2", "accent-bright", "accent-3", "accent-3"];
const colorAt = (index: number) => `var(--${bubbleColors[index % bubbleColors.length]})`;

const shortGenreLabels: Record<string, string> = {
  Animation: "Anim.",
  "Science Fiction": "SF",
};

function bubbleLabel(genre: string) {
  return shortGenreLabels[genre] ?? genreFr(genre);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function GenreBubbles({
  genreBubbles,
  detectedFilmsCount = 50,
}: {
  genreBubbles?: GenreBubble[];
  detectedFilmsCount?: number;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const cloudRef = useRef<HTMLDivElement | null>(null);
  const bubbleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [pinned, setPinned] = usePinned(cardRef);
  const listRef = useRef<HTMLDivElement | null>(null);
  const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [tooltip, setTooltip] = useState<{
    bubble: GenreBubble;
    x: number;
    y: number;
  } | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
  const dropTimeoutRef = useRef<number | undefined>(undefined);

  // Verrou relâché (clic dehors, Échap) : l'infobulle disparaît avec lui.
  useEffect(() => {
    if (pinned === null) setTooltip(null);
  }, [pinned]);

  // Re-triggers the bubble drop every time the cloud re-enters view (not just
  // once, and only on scroll, never on hover), so scrolling away and back
  // replays the ball-pit fall. isDropping is plain state (not an imperative
  // classList tweak) so unrelated re-renders, like a hover-triggered tooltip,
  // can never resurrect the animation class after it has finished.
  useEffect(() => {
    const node = cloudRef.current;
    if (!node || !genreBubbles || genreBubbles.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bubbleCount = Math.min(genreBubbles.length, 8);
    const totalDuration = 820 + (bubbleCount - 1) * 90 + 120;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.disconnect(); // une seule fois par visite de la page (bug de scroll, 27/10/2026)
          window.clearTimeout(dropTimeoutRef.current);
          setIsDropping(false);
          requestAnimationFrame(() => {
            setIsDropping(true);
            dropTimeoutRef.current = window.setTimeout(() => setIsDropping(false), totalDuration);
          });
        });
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(dropTimeoutRef.current);
    };
  }, [genreBubbles]);

  // Slides each bar in proportionally to its share, replaying on every
  // re-entry like the rest of the site's one-shot animations.
  useEffect(() => {
    const node = listRef.current;
    if (!node || !genreBubbles || genreBubbles.length === 0) return;

    const barBubbles = genreBubbles.slice(0, 6);
    const targets = barBubbles.map((bubble) => clamp((bubble.share ?? 0) * 100, 0, 100));
    const keys = barBubbles.map((bubble) => bubble.genre);

    function setWidths(fractionOfTarget: number) {
      keys.forEach((key, index) => {
        barRefs.current.get(key)?.style.setProperty("width", `${targets[index] * fractionOfTarget}%`);
      });
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setWidths(1);
      return;
    }

    setWidths(0);
    let rafId = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.disconnect(); // une seule fois par visite de la page (bug de scroll, 27/10/2026)
          cancelAnimationFrame(rafId);
          setWidths(0);
          const duration = 1200;
          const stagger = 90;
          const startTime = performance.now();
          function tick(now: number) {
            let stillRunning = false;
            keys.forEach((key, index) => {
              const elapsed = now - startTime - index * stagger;
              const t = clamp(elapsed / duration, 0, 1);
              if (elapsed < duration) stillRunning = true;
              barRefs.current.get(key)?.style.setProperty("width", `${targets[index] * easeOutCubic(t)}%`);
            });
            if (stillRunning) rafId = requestAnimationFrame(tick);
          }
          rafId = requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [genreBubbles]);

  if (!genreBubbles || genreBubbles.length === 0) {
    return null;
  }

  const displayedBubbles = genreBubbles.slice(0, 8);
  const listBubbles = genreBubbles.slice(0, 6);

  function tooltipPosition(clientX: number, clientY: number) {
    const rect = cloudRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }

    const tooltipWidth = Math.min(280, Math.max(0, rect.width - 24));
    const tooltipHeight = Math.min(220, Math.max(0, rect.height - 24));
    const offsetX = 14;
    const offsetY = 14;
    const rawX = clientX - rect.left + offsetX;
    const rawY = clientY - rect.top + offsetY;

    return {
      x: clamp(rawX, 12, rect.width - tooltipWidth),
      y: clamp(rawY, 12, rect.height - tooltipHeight),
    };
  }

  function showTooltipFromPoint(
    bubble: GenreBubble,
    clientX: number,
    clientY: number,
  ) {
    setTooltip({
      bubble,
      ...tooltipPosition(clientX, clientY),
    });
  }

  function showTooltipFromElement(bubble: GenreBubble, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setTooltip({
      bubble,
      ...tooltipPosition(centerX, centerY),
    });
  }

  function showTooltip(
    bubble: GenreBubble,
    event: ReactPointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>,
  ) {
    const { clientX, clientY } = event;
    event.stopPropagation();
    showTooltipFromPoint(bubble, clientX, clientY);
  }

  function moveTooltip(event: ReactPointerEvent<HTMLDivElement>) {
    if (pinned) return;
    const { clientX, clientY } = event;
    setTooltip((current) =>
      current ? { ...current, ...tooltipPosition(clientX, clientY) } : current,
    );
  }

  function closeTooltip() {
    setTooltip(null);
  }

  function enterBubble(
    bubble: GenreBubble,
    event: ReactPointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>,
  ) {
    if (pinned) return;
    showTooltip(bubble, event);
    setHoveredGenre(bubble.genre);
  }

  function leaveBubble() {
    if (pinned) return;
    closeTooltip();
    setHoveredGenre(null);
  }

  /** Clic sur une bulle ou sur sa barre : la fige (ou la relâche si elle l'était déjà). */
  function togglePin(bubble: GenreBubble) {
    if (pinned === bubble.genre) {
      setPinned(null);
      setHoveredGenre(null);
      return;
    }
    setPinned(bubble.genre);
    setHoveredGenre(bubble.genre);
    const element = bubbleRefs.current.get(bubble.genre);
    if (element) showTooltipFromElement(bubble, element);
  }

  return (
    <section className="genre-bubbles-section" aria-label="La Constellation">
      <div className="sectionHeading">
        <h2>La Constellation</h2>
        <p>Les genres qui reviennent le plus dans tes {detectedFilmsCount} films détectés.</p>
      </div>

      <div className="genre-bubbles-card" ref={cardRef}>
        <div className={`genre-bubbles-cloud${pinned ? " is-isolated" : ""}`} ref={cloudRef}>
          {displayedBubbles.map((bubble, index) => {
            const size = Math.max(72, Math.min(168, bubble.size * 1.25));
            const share = formatShare(bubble.share);
            const position = bubblePositions[index];
            const style = {
              "--bubble-size": `${size}px`,
              "--bubble-x": position.x,
              "--bubble-y": position.y,
              "--bubble-z": position.z,
              "--fall-delay": `${index * 90}ms`,
              "--bubble-color": colorAt(index),
            } as CSSProperties;
            const isActive = pinned ? pinned === bubble.genre : tooltip?.bubble.genre === bubble.genre || hoveredGenre === bubble.genre;
            return (
              <div
                className={`genre-bubble${isDropping ? " genre-bubble-drop" : ""}${isActive ? " genre-bubble-active" : ""}`}
                key={bubble.genre}
                ref={(el) => {
                  if (el) bubbleRefs.current.set(bubble.genre, el);
                  else bubbleRefs.current.delete(bubble.genre);
                }}
                style={style}
                role="button"
                aria-pressed={pinned === bubble.genre}
                tabIndex={0}
                aria-label={`${genreFr(bubble.genre)} : ${bubble.count} occurrences${share ? `, ${share}` : ""}`}
                onPointerEnter={(event) => enterBubble(bubble, event)}
                onPointerMove={moveTooltip}
                onPointerLeave={leaveBubble}
                onClick={() => togglePin(bubble)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    togglePin(bubble);
                  }
                }}
                onFocus={(event) => {
                  if (pinned) return;
                  showTooltipFromElement(bubble, event.currentTarget);
                  setHoveredGenre(bubble.genre);
                }}
                onBlur={leaveBubble}
              >
                <strong>{bubbleLabel(bubble.genre)}</strong>
                <span>{bubble.count}</span>
              </div>
            );
          })}

          {tooltip ? (
            <div
              className={`genre-bubble-tooltip${pinned ? " is-pinned" : ""}`}
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              <strong>{genreFr(tooltip.bubble.genre)}</strong>
              <span>
                {tooltip.bubble.count} {tooltip.bubble.count > 1 ? "occurrences" : "occurrence"}
              </span>
              {tooltip.bubble.films?.length ? (
                <ul>
                  {/* Figée, l'infobulle liste tous les films, chacun relié à sa fiche Letterboxd. */}
                  {tooltip.bubble.films.slice(0, pinned ? undefined : 6).map((film) => {
                    const url = pinned ? letterboxdFilmUrl(film.slug) : null;
                    const label = (
                      <>
                        {film.title || "Sans titre"}
                        {film.year ? <em>{film.year}</em> : null}
                      </>
                    );
                    return (
                      <li key={`${film.slug}-${film.title}`}>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer">
                            {label}
                          </a>
                        ) : (
                          label
                        )}
                      </li>
                    );
                  })}
                  {!pinned && tooltip.bubble.films.length > 6 ? (
                    <li className="genre-bubble-tooltip-more">
                      + {tooltip.bubble.films.length - 6} autres
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="genre-bubbles-list" ref={listRef}>
          {listBubbles.map((bubble, index) => (
            <div
              className={`genre-bar-row${(pinned ?? hoveredGenre) === bubble.genre ? " genre-bar-row-linked" : ""}`}
              key={bubble.genre}
              style={{ "--bubble-color": colorAt(index) } as CSSProperties}
              role="button"
              tabIndex={0}
              aria-pressed={pinned === bubble.genre}
              onMouseEnter={() => !pinned && setHoveredGenre(bubble.genre)}
              onMouseLeave={() => !pinned && setHoveredGenre(null)}
              onClick={() => togglePin(bubble)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  togglePin(bubble);
                }
              }}
            >
              <div className="genre-bar-heading">
                <span>{genreFr(bubble.genre)}</span>
                <span className="genre-bar-meta">
                  <strong>{bubble.count}</strong>
                  <small>{formatShare(bubble.share) ?? "n/a"}</small>
                </span>
              </div>
              <div className="genre-bar-track">
                <div
                  className="genre-bar-fill"
                  ref={(el) => {
                    if (el) barRefs.current.set(bubble.genre, el);
                    else barRefs.current.delete(bubble.genre);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
