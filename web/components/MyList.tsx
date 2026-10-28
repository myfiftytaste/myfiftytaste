"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readMyPseudo } from "../lib/myPseudo";
import BrandLockup from "./BrandLockup";

// Onglet « Ma liste » (lot 14, maquette du 27/10/2026) : les 50 films du wrapped, triables.
// Vue A par défaut (mur d'affiches), vue B en option (liste compacte, groupée par mois sur le tri par date).

type Film = {
  title?: string | null;
  rss_title?: string | null;
  year?: number | null;
  letterboxd_slug?: string | null;
  rss_poster_url?: string | null;
  user_rating?: number | null;
  watched_at?: string | null;
  runtime?: number | null;
  directors?: string[] | null;
  average_rating?: number | null;
  tmdb_votes?: number | null;
};

type SortKey = "watch" | "rating" | "year" | "title" | "runtime" | "pop";
type View = "grid" | "list";

const SORTS: { key: SortKey; label: string; asc: string; desc: string }[] = [
  { key: "watch", label: "Visionnage", asc: "Plus ancien d'abord", desc: "Plus récent d'abord" },
  { key: "rating", label: "Ma note", asc: "Plus basse d'abord", desc: "Plus haute d'abord" },
  { key: "year", label: "Sortie", asc: "Plus ancien d'abord", desc: "Plus récent d'abord" },
  { key: "title", label: "Titre", asc: "A → Z", desc: "Z → A" },
  { key: "runtime", label: "Durée", asc: "Plus court d'abord", desc: "Plus long d'abord" },
  { key: "pop", label: "Popularité", asc: "Plus confidentiel d'abord", desc: "Plus populaire d'abord" },
];

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTHS_LONG = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function stars(rating: number | null | undefined) {
  if (typeof rating !== "number") return "Sans note";
  return "★".repeat(Math.floor(rating)) + (rating % 1 ? "½" : "");
}

function duration(minutes: number | null | undefined) {
  if (typeof minutes !== "number") return null;
  return `${Math.floor(minutes / 60)}h${String(Math.round(minutes % 60)).padStart(2, "0")}`;
}

function votes(count: number | null | undefined) {
  if (typeof count !== "number") return null;
  return count >= 1000 ? `${Math.round(count / 100) / 10} k votes`.replace(".", ",") : `${count} votes`;
}

function filmTitle(film: Film) {
  return film.title || film.rss_title?.replace(/,\s*\d{4}.*$/, "") || "Sans titre";
}

// Chaque film mène toujours à Letterboxd : sa fiche, sinon une recherche par titre.
function letterboxdUrl(film: Film) {
  return film.letterboxd_slug
    ? `https://letterboxd.com/film/${film.letterboxd_slug}/`
    : `https://letterboxd.com/search/films/${encodeURIComponent(filmTitle(film))}/`;
}

function sortValue(film: Film, key: SortKey): number | string | null {
  switch (key) {
    case "watch":
      return film.watched_at ? Date.parse(film.watched_at) || null : null;
    case "rating":
      return film.user_rating ?? null;
    case "year":
      return film.year ?? null;
    case "title":
      return filmTitle(film).toLocaleLowerCase("fr");
    case "runtime":
      return film.runtime ?? null;
    case "pop":
      return film.tmdb_votes ?? null;
  }
}

export default function MyList() {
  const [pseudo, setPseudo] = useState<string | null | undefined>(undefined);
  const [films, setFilms] = useState<Film[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [sortKey, setSortKey] = useState<SortKey>("watch");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<View>("grid");

  useEffect(() => setPseudo(readMyPseudo()), []);

  useEffect(() => {
    if (!pseudo) return;
    let cancelled = false;
    fetch(`/api/profile/${encodeURIComponent(pseudo)}/films`)
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 404) return setStatus("missing");
        if (!response.ok) return setStatus("error");
        const data = await response.json();
        setFilms(data.films ?? []);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [pseudo]);

  const sorted = useMemo(() => {
    const list = [...(films ?? [])];
    // Les films sans valeur pour le critère choisi vont toujours à la fin, dans les deux sens.
    list.sort((a, b) => {
      const x = sortValue(a, sortKey);
      const y = sortValue(b, sortKey);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      const compared = typeof x === "string" ? x.localeCompare(String(y), "fr") : x - (y as number);
      return direction === "asc" ? compared : -compared;
    });
    return list;
  }, [films, sortKey, direction]);

  // Les votes TMDB n'existent que pour les profils calculés par le nouveau worker : sans eux, pas de critère.
  const hasVotes = (films ?? []).some((film) => typeof film.tmdb_votes === "number");
  const sorts = SORTS.filter((sort) => sort.key !== "pop" || hasVotes);
  const current = SORTS.find((sort) => sort.key === sortKey) ?? SORTS[0];

  function pick(key: SortKey) {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setDirection(key === "title" ? "asc" : "desc");
  }

  function badge(film: Film) {
    if (sortKey === "runtime") return duration(film.runtime);
    if (sortKey === "pop") return votes(film.tmdb_votes);
    if (sortKey === "year") return film.year ? String(film.year) : null;
    if (sortKey === "watch" && film.watched_at) {
      const date = new Date(film.watched_at);
      return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
    }
    return null;
  }

  // Colonne de droite de la liste : la durée y est toujours ; au-dessus, la date de visionnage
  // (ou les votes sur le tri popularité). Rien en plus sur les tris durée et sortie (déjà affichées).
  function rowMetric(film: Film) {
    if (sortKey === "pop") return votes(film.tmdb_votes);
    if (sortKey === "runtime" || sortKey === "year" || !film.watched_at) return null;
    const date = new Date(film.watched_at);
    return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  }

  // Liste compacte triée par date : intertitres par mois.
  const groups = useMemo(() => {
    const result: { label: string; films: Film[] }[] = [];
    for (const film of sorted) {
      let label = "";
      if (sortKey === "watch" && film.watched_at) {
        const date = new Date(film.watched_at);
        label = `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
      }
      if (!result.length || result[result.length - 1].label !== label) result.push({ label, films: [] });
      result[result.length - 1].films.push(film);
    }
    return result;
  }, [sorted, sortKey]);

  return (
    <main className="pageShell listShell">
      <header className="siteHeader">
        <BrandLockup />
      </header>
      <h1 className="listTitle">Ma liste</h1>

      {pseudo === null ? (
        <p className="listEmpty">
          Saisis d&apos;abord ton pseudo Letterboxd sur <Link href="/">l&apos;accueil</Link> : ta liste apparaîtra ici.
        </p>
      ) : status === "missing" ? (
        <p className="listEmpty">
          Ton wrapped n&apos;a pas encore été calculé. <Link href={`/profile/${encodeURIComponent(pseudo ?? "")}`}>Le lancer</Link>
        </p>
      ) : status === "error" ? (
        <p className="listEmpty">La liste n&apos;a pas pu être chargée. Réessaie dans un instant.</p>
      ) : status === "loading" ? (
        <p className="listEmpty">Chargement de tes films…</p>
      ) : (
        <>
          <div className="listToolbar">
            <p className="listSummary">
              {sorted.length} films · {current.label.toLowerCase()} · {(direction === "asc" ? current.asc : current.desc).toLowerCase()}
            </p>
            <div className="listViews" role="group" aria-label="Affichage">
              <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
                Affiches
              </button>
              <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
                Liste
              </button>
            </div>
          </div>

          <div className="listSorts" role="group" aria-label="Trier par">
            {sorts.map((sort) => (
              <button
                key={sort.key}
                type="button"
                className="listSort"
                aria-pressed={sort.key === sortKey}
                onClick={() => pick(sort.key)}
                title={sort.key === sortKey ? "Inverser l'ordre" : `Trier par ${sort.label.toLowerCase()}`}
              >
                {sort.label}
                {sort.key === sortKey ? <span aria-hidden="true">{direction === "asc" ? " ↑" : " ↓"}</span> : null}
              </button>
            ))}
            {/* Recherche et filtres : prévus pour novembre (décision du 27/10/2026). */}
            <span className="listSoonTools">
              <button type="button" className="listSort listIconButton" disabled aria-label="Rechercher un titre (bientôt)" title="Rechercher un titre : bientôt">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6" />
                  <path d="M15 15l5 5" />
                </svg>
              </button>
              <button type="button" className="listSort listIconButton" disabled aria-label="Filtrer (bientôt)" title="Filtres : bientôt">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 5h16l-6 7.5V19l-4-2v-4.5z" />
                </svg>
              </button>
              <span className="diversRowSoon">Bientôt</span>
            </span>
          </div>

          {view === "grid" ? (
            <ul className="listGrid">
              {sorted.map((film, index) => (
                <li key={`${film.letterboxd_slug}-${index}`}>
                  <a
                    className="listPosterLink"
                    href={letterboxdUrl(film)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="listPoster">
                      {film.rss_poster_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={film.rss_poster_url} alt="" loading="lazy" />
                      ) : (
                        <span className="listPosterFallback">{filmTitle(film)}</span>
                      )}
                      {badge(film) ? <span className="listBadge">{badge(film)}</span> : null}
                    </span>
                    <span className="listGridTitle">
                      {filmTitle(film)}
                      <span className="listLbMark" aria-hidden="true"> ↗</span>
                    </span>
                    <span className="listStars">{stars(film.user_rating)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="listRows">
              {groups.map((group, groupIndex) => (
                <section key={`${group.label}-${groupIndex}`} aria-label={group.label || undefined}>
                  {group.label ? <h2 className="listMonth">{group.label}</h2> : null}
                  {group.films.map((film, index) => {
                    const gap =
                      typeof film.user_rating === "number" && typeof film.average_rating === "number"
                        ? film.user_rating - film.average_rating
                        : null;
                    return (
                      <a
                        key={`${film.letterboxd_slug}-${index}`}
                        className="listRow"
                        href={letterboxdUrl(film)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="listThumb">
                          {film.rss_poster_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={film.rss_poster_url} alt="" loading="lazy" />
                          ) : null}
                        </span>
                        <span className="listRowText">
                          <span className="listRowTitle">
                            {filmTitle(film)}
                            <span className="listLbMark" aria-hidden="true"> ↗</span>
                          </span>
                          <span className="listRowMeta">{[film.year, film.directors?.[0]].filter(Boolean).join(" · ")}</span>
                        </span>
                        <span className="listStars listRowStars">
                            {stars(film.user_rating)}
                            {gap !== null ? (
                              <span className={gap >= 0.3 ? "listGapUp" : gap <= -0.3 ? "listGapDown" : "listGapEven"}>
                                {" "}
                                ({gap > 0 ? "+" : ""}
                                {gap.toFixed(1).replace(".", ",")} vs Letterboxd)
                              </span>
                            ) : null}
                        </span>
                        <span className="listRowMetric">
                          {rowMetric(film) ? <span>{rowMetric(film)}</span> : null}
                          <span>{duration(film.runtime)}</span>
                        </span>
                      </a>
                    );
                  })}
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
