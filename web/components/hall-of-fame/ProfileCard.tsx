"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { avatarColorClass, initials, type AvatarColor } from "../../lib/avatarColor";
import type { ContinentFilmRef, ProfileCardData } from "../../lib/hallOfFameTypes";
import { letterboxdFilmUrl } from "../../lib/usePinned";
import { letterboxdProfileUrl } from "../../lib/username";
import BadgeRow from "./BadgeRow";

// Encadré de profil des bulles du Hall of Fame (10/11/2026) : pseudo, badges, « Membre depuis »,
// lien Letterboxd, et pour les tops par continent les films qui ont classé la personne.
// Survol sur ordinateur, appui sur écran tactile. Placé en position fixe d'après la bulle : il
// marche pareil pour un podium, une carte de saison close ou une épingle SVG de la carte.

const VISIBLE_FILMS = 3;
const CLOSE_DELAY_MS = 180;

function memberSince(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

/** Les 3 premiers films en lien, le reste derrière « … ». Même règle partout où une liste de films s'affiche dans un encadré. */
export function FilmShortList({ films }: { films: ContinentFilmRef[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? films : films.slice(0, VISIBLE_FILMS);
  return (
    <>
      <ul className="hofCardFilmList">
        {shown.map((film) => {
          const url = letterboxdFilmUrl(film.slug);
          return (
            <li key={`${film.slug ?? film.title}-${film.year}`}>
              {url ? (
                <a href={url} target="_blank" rel="noreferrer">
                  {film.title}
                </a>
              ) : (
                film.title
              )}
              {film.year ? <em>{film.year}</em> : null}
            </li>
          );
        })}
      </ul>
      {films.length > VISIBLE_FILMS ? (
        <button
          type="button"
          className="hofCardMore"
          aria-expanded={open}
          aria-label={open ? "Réduire la liste" : `Voir les ${films.length - VISIBLE_FILMS} autres films`}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "−" : "…"}
        </button>
      ) : null}
    </>
  );
}

type Anchor = { left: number; top: number; bottom: number };

function useProfileCard() {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const triggerRef = useRef<Element | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const openFrom = useCallback((element: Element) => {
    window.clearTimeout(closeTimer.current);
    triggerRef.current = element;
    const rect = element.getBoundingClientRect();
    setAnchor({ left: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
  }, []);
  const close = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setAnchor(null);
  }, []);
  const closeSoon = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setAnchor(null), CLOSE_DELAY_MS);
  }, []);
  const keep = useCallback(() => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!anchor) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!cardRef.current?.contains(target) && !triggerRef.current?.contains(target)) close();
    };
    const onKey = (event: globalThis.KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [anchor, close]);

  const hoverCapable = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;
  const triggerProps = {
    "aria-haspopup": "dialog" as const,
    "aria-expanded": Boolean(anchor),
    onClick: (event: { currentTarget: Element }) => (anchor ? close() : openFrom(event.currentTarget)),
    onMouseEnter: (event: { currentTarget: Element }) => hoverCapable() && openFrom(event.currentTarget),
    onMouseLeave: () => hoverCapable() && closeSoon(),
  };
  // Un <button> gère Entrée et Espace tout seul ; l'épingle SVG (<g role="button">) en a besoin.
  const keyProps = {
    onKeyDown: (event: KeyboardEvent<Element>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (anchor) close();
        else openFrom(event.currentTarget);
      }
    },
  };
  return { anchor, triggerProps, keyProps, cardRef, keep, closeSoon, hoverCapable };
}

function ProfileCardPopover({
  username,
  color,
  card,
  films,
  anchor,
  cardRef,
  onEnter,
  onLeave,
}: {
  username: string;
  color?: AvatarColor;
  card: ProfileCardData;
  films?: ContinentFilmRef[];
  anchor: Anchor;
  cardRef: React.MutableRefObject<HTMLDivElement | null>;
  onEnter: () => void;
  onLeave: () => void;
}) {
  // Au-dessus de la bulle s'il y a la place, sinon en dessous ; jamais coupé sur les côtés.
  const below = anchor.top < 300;
  const half = Math.min(150, (window.innerWidth - 32) / 2);
  const left = Math.min(Math.max(anchor.left, half + 16), window.innerWidth - half - 16);
  const since = memberSince(card.since);
  const { manual, earned, overflowCount } = card.badges;
  // Rendu hors de la bulle (portail) : rien ne le rogne, et il sort aussi d'un SVG. Il reste dans
  // .hof-shell pour hériter des couleurs du Hall of Fame.
  return createPortal(
    <div
      ref={cardRef}
      className={`hofCard${below ? " hofCardBelow" : ""}`}
      role="dialog"
      aria-label={`Profil de ${username}`}
      style={{ left, top: below ? anchor.bottom + 10 : anchor.top - 10 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="hofCardHead">
        <span className={`hofAvatar${avatarColorClass(color)}`} aria-hidden="true">
          {initials(username)}
        </span>
        <div>
          <strong>{username}</strong>
          {since ? <span>Membre depuis {since}</span> : null}
        </div>
      </div>
      <BadgeRow manual={manual} earned={earned} overflowCount={overflowCount} />
      {films?.length ? (
        <div className="hofCardFilms">
          <span>Classé·e grâce à ces films</span>
          <FilmShortList films={films} />
        </div>
      ) : null}
      <a className="hofCardLink" href={letterboxdProfileUrl(username)} target="_blank" rel="noreferrer">
        letterboxd.com/{username} ↗
      </a>
    </div>,
    document.querySelector(".hof-shell") ?? document.body,
  );
}

/** Bulle cliquable (podium, carte de saison close). Sans données d'encadré : lien direct, comme avant. */
export function ProfileBubble({
  username,
  color,
  card,
  className,
  ariaLabel,
  children,
}: {
  username: string;
  color?: AvatarColor;
  card?: ProfileCardData;
  className: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  const { anchor, triggerProps, cardRef, keep, closeSoon, hoverCapable } = useProfileCard();
  if (!card) {
    return (
      <a href={letterboxdProfileUrl(username)} target="_blank" rel="noreferrer" aria-label={ariaLabel} className={className}>
        {children}
      </a>
    );
  }
  return (
    <>
      <button type="button" className={`${className} hofCardTrigger`} aria-label={ariaLabel} {...triggerProps}>
        {children}
      </button>
      {anchor ? (
        <ProfileCardPopover
          username={username}
          color={color}
          card={card}
          anchor={anchor}
          cardRef={cardRef}
          onEnter={keep}
          onLeave={() => hoverCapable() && closeSoon()}
        />
      ) : null}
    </>
  );
}

/** Version SVG pour les épingles de la carte des continents. */
export function ProfilePin({
  username,
  color,
  card,
  films,
  ariaLabel,
  children,
}: {
  username: string;
  color?: AvatarColor;
  card?: ProfileCardData;
  films: ContinentFilmRef[];
  ariaLabel: string;
  children: ReactNode;
}) {
  const { anchor, triggerProps, keyProps, cardRef, keep, closeSoon, hoverCapable } = useProfileCard();
  return (
    <>
      <g role="button" tabIndex={0} aria-label={ariaLabel} className="hofPin" {...triggerProps} {...keyProps}>
        {children}
      </g>
      {anchor ? (
        <ProfileCardPopover
          username={username}
          color={color}
          card={card ?? { since: null, badges: { manual: null, earned: [], overflowCount: 0 } }}
          films={films}
          anchor={anchor}
          cardRef={cardRef}
          onEnter={keep}
          onLeave={() => hoverCapable() && closeSoon()}
        />
      ) : null}
    </>
  );
}
