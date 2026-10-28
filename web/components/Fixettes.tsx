"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// « Les Fixettes » (maquette A validée le 28/10/2026) : cinéaste et interprète qui reviennent le plus,
// affiches en éventail, puis « Les facts ». Calculé par le worker (scripts/fixettes.py) ; les profils
// générés avant n'ont pas ce bloc et le module ne s'affiche pas.

type FilmRef = { title?: string | null; poster?: string | null; url?: string | null };

type Fixette = {
  name: string;
  photo?: string | null;
  count: number;
  average_rating?: number | null;
  films: FilmRef[];
} | null;

export type FixettesData = {
  director: Fixette;
  performer: Fixette;
  facts: { share: number | null; known: number; total: number; dots: ("y" | "n" | "u")[] };
};

const FAN = ["fixPoster fixPosterLeft", "fixPoster fixPosterRight", "fixPoster fixPosterFront"];

function frenchRating(value: number) {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function Card({ role, fixette }: { role: "Cinéaste" | "Interprète"; fixette: Fixette }) {
  if (!fixette) {
    return (
      <div className="fixCard fixCardEmpty">
        <span className="fixFan" aria-hidden="true">
          {FAN.map((className) => (
            <span key={className} className={`${className} fixPosterGhost`} />
          ))}
        </span>
        <span className="fixText">
          <span className="fixRole">{role}</span>
          <span className="fixName fixNameEmpty">Pas de {role.toLowerCase()} en double</span>
          <span className="fixMeta">Chaque film a le sien : tu butines.</span>
        </span>
      </div>
    );
  }
  // Le film du milieu de l'éventail est devant : on y met le premier film.
  const films = [fixette.films[1], fixette.films[2], fixette.films[0]];
  return (
    <div className="fixCard">
      <span className="fixFan" aria-hidden="true">
        {films.map((film, index) =>
          film ? (
            <span key={index} className={FAN[index]}>
              {film.poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={film.poster} alt="" loading="lazy" />
              ) : (
                <span className="fixPosterTitle">{film.title}</span>
              )}
            </span>
          ) : null,
        )}
      </span>
      <span className="fixText">
        <span className="fixRole">{role}</span>
        <span className="fixWho">
          {fixette.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="fixPhoto" src={`https://image.tmdb.org/t/p/w92${fixette.photo}`} alt="" loading="lazy" />
          ) : (
            <span className="fixPhoto fixInitial" aria-hidden="true">
              {fixette.name.charAt(0)}
            </span>
          )}
          <span className="fixName">{fixette.name}</span>
        </span>
        <span className="fixCount">
          <b>{fixette.count} films</b> sur tes 50
        </span>
        <span className="fixMeta">
          {typeof fixette.average_rating === "number" ? `Ta note moyenne : ★ ${frenchRating(fixette.average_rating)} · ` : ""}
          <a href={`https://letterboxd.com/search/${encodeURIComponent(fixette.name)}/`} target="_blank" rel="noreferrer">
            ↗ Letterboxd
          </a>
        </span>
        <span className="srOnly">Films : {fixette.films.map((film) => film.title).filter(Boolean).join(", ")}</span>
      </span>
    </div>
  );
}

export default function Fixettes({ data }: { data?: FixettesData | null }) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  // L'éventail et les points se jouent une fois, à la première apparition (comme les autres modules).
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setVisible(true);
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!data) return null;
  const { facts } = data;

  return (
    <section ref={ref} className={`fixSection${visible ? " isVisible" : ""}`} aria-label="Les Fixettes">
      <div className="sectionHeading">
        <h2>Les Fixettes</h2>
        <p>Certaines personnes ont les clés de ton cœur, on dirait.</p>
      </div>
      <div className="fixCards">
        <Card role="Cinéaste" fixette={data.director} />
        <Card role="Interprète" fixette={data.performer} />
      </div>

      {facts.share !== null ? (
        <div className="fixFacts">
          <div className="fixFactsFigure">
            <span className="fixRole">Les facts</span>
            <span className="fixShare">{Math.round(facts.share * 100)} %</span>
          </div>
          <div className="fixFactsText">
            <p>
              de tes {facts.total} derniers films ont été réalisés par{" "}
              <b>au moins une femme ou une personne non binaire</b>.
            </p>
            <div className="fixDots" aria-hidden="true">
              {facts.dots.map((dot, index) => (
                <span key={index} className={`fixDot fixDot-${dot}`} style={{ "--i": index } as CSSProperties} />
              ))}
            </div>
            <p className="fixLegend">
              <span className="fixDot fixDot-y" aria-hidden="true" /> réalisé par au moins une femme ou une personne non binaire
              {facts.total > facts.known ? (
                <>
                  {" "}· <span className="fixDot fixDot-u" aria-hidden="true" /> {facts.total - facts.known} film
                  {facts.total - facts.known > 1 ? "s" : ""} dont on ne connaît pas l&apos;équipe
                </>
              ) : null}{" "}
              · calculé sur {facts.known} films, d&apos;après TMDB
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
