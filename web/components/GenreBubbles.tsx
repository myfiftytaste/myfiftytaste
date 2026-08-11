"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { CSSProperties } from "react";

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

const bubblePositions = [
  { x: "36%", y: "52%", z: 8 },
  { x: "66%", y: "30%", z: 7 },
  { x: "68%", y: "61%", z: 6 },
  { x: "31%", y: "30%", z: 5 },
  { x: "50%", y: "72%", z: 4 },
  { x: "81%", y: "48%", z: 3 },
  { x: "25%", y: "72%", z: 2 },
  { x: "50%", y: "35%", z: 1 },
];

const shortGenreLabels: Record<string, string> = {
  Animation: "Anim.",
  "Science Fiction": "Sci-Fi",
};

function bubbleLabel(genre: string) {
  return shortGenreLabels[genre] ?? genre;
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
  const cloudRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [tooltip, setTooltip] = useState<{
    bubble: GenreBubble;
    x: number;
    y: number;
  } | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const dropTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    function handlePointerDown(event: globalThis.PointerEvent) {
      if (!tooltip) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (!target || !cloudRef.current) {
        return;
      }
      if (!cloudRef.current.contains(target)) {
        setTooltip(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [tooltip]);

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

    const targets = genreBubbles.slice(0, 6).map((bubble) => clamp((bubble.share ?? 0) * 100, 0, 100));

    function setWidths(fractionOfTarget: number) {
      barRefs.current.forEach((el, index) => {
        el?.style.setProperty("width", `${targets[index] * fractionOfTarget}%`);
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
          cancelAnimationFrame(rafId);
          setWidths(0);
          const duration = 900;
          const stagger = 70;
          const startTime = performance.now();
          function tick(now: number) {
            let stillRunning = false;
            barRefs.current.forEach((el, index) => {
              const elapsed = now - startTime - index * stagger;
              const t = clamp(elapsed / duration, 0, 1);
              if (elapsed < duration) stillRunning = true;
              el?.style.setProperty("width", `${targets[index] * easeOutCubic(t)}%`);
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
    const { clientX, clientY } = event;
    setTooltip((current) =>
      current ? { ...current, ...tooltipPosition(clientX, clientY) } : current,
    );
  }

  function closeTooltip() {
    setTooltip(null);
  }

  return (
    <section className="genre-bubbles-section" aria-label="Constellation des genres">
      <div className="sectionHeading">
        <p className="eyebrow">Genres</p>
        <h2>Constellation des genres</h2>
        <p>Les genres qui reviennent le plus dans tes {detectedFilmsCount} films détectés.</p>
      </div>

      <div className="genre-bubbles-card">
        <div className="genre-bubbles-cloud" ref={cloudRef}>
          {displayedBubbles.map((bubble, index) => {
            const size = Math.max(62, Math.min(136, bubble.size));
            const share = formatShare(bubble.share);
            const position = bubblePositions[index];
            const style = {
              "--bubble-size": `${size}px`,
              "--bubble-x": position.x,
              "--bubble-y": position.y,
              "--bubble-z": position.z,
              "--fall-delay": `${index * 90}ms`,
            } as CSSProperties;
            const isActive = tooltip?.bubble.genre === bubble.genre;
            return (
              <div
                className={`genre-bubble${isDropping ? " genre-bubble-drop" : ""}${isActive ? " genre-bubble-active" : ""}`}
                key={bubble.genre}
                style={style}
                role="button"
                tabIndex={0}
                aria-label={`${bubble.genre}: ${bubble.count} occurrences${share ? `, ${share}` : ""}`}
                onPointerEnter={(event) => showTooltip(bubble, event)}
                onPointerMove={moveTooltip}
                onPointerLeave={closeTooltip}
                onClick={(event) => showTooltip(bubble, event)}
                onFocus={(event) => showTooltipFromElement(bubble, event.currentTarget)}
                onBlur={closeTooltip}
              >
                <strong>{bubbleLabel(bubble.genre)}</strong>
                <span>{bubble.count}</span>
              </div>
            );
          })}

          {tooltip ? (
            <div
              className="genre-bubble-tooltip"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              <strong>{tooltip.bubble.genre}</strong>
              <span>
                {tooltip.bubble.count} {tooltip.bubble.count > 1 ? "occurrences" : "occurrence"}
              </span>
              {tooltip.bubble.films?.length ? (
                <ul>
                  {tooltip.bubble.films.slice(0, 6).map((film) => (
                    <li key={`${film.slug}-${film.title}`}>
                      {film.title || "Untitled"}
                      {film.year ? <em>{film.year}</em> : null}
                    </li>
                  ))}
                  {tooltip.bubble.films.length > 6 ? (
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
          {(() => {
            barRefs.current = [];
            return listBubbles.map((bubble, index) => (
              <div className="genre-bar-row" key={bubble.genre}>
                <div className="genre-bar-heading">
                  <span>{bubble.genre}</span>
                  <span className="genre-bar-meta">
                    <strong>{bubble.count}</strong>
                    <small>{formatShare(bubble.share) ?? "n/a"}</small>
                  </span>
                </div>
                <div className="genre-bar-track">
                  <div className="genre-bar-fill" ref={(el) => { barRefs.current[index] = el; }} />
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </section>
  );
}
