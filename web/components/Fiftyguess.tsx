"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// Fiftyguess, le jeu de la semaine (prototype validé le 28/10/2026) : une affiche se dévoile par un
// cercle qui grandit pendant 50 secondes. Mode compétitif (chrono, classement de la semaine) ou zen.
// Le chrono vit sur le serveur (/api/game) ; ici on ne fait que l'afficher.

type Answer = { title_fr: string; title_orig: string; year: number | null; director: string | null; slug: string | null };
type GameRound = {
  id: number;
  kind: "week" | "bonus";
  opens_on: string;
  month: string;
  locked: boolean;
  play: { mode: "compet" | "zen"; elapsed: number | null; wrong: number; penalty: number; outcome: string | null; score: number | null } | null;
  poster: { url: string; focus_x: number; focus_y: number } | null;
  answer: Answer | null;
  leaderboard?: { username: string; score: number; outcome: string }[];
  wrongGuess?: boolean;
  added?: number;
};
type GameState = { username: string | null; rounds: GameRound[]; reveal: number; cap: number };

const RULES_KEY = "fiftyguess-regles";
const W = 400;
const H = 600;

function clock(seconds: number) {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")},${Math.floor((s * 10) % 10)}`;
}

function frenchDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function norm(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function Rules({ onPlay }: { onPlay: () => void }) {
  return (
    <section className="fgRules" aria-labelledby="fg-rules">
      <div className="fgRulesHead">
        <h2 id="fg-rules">Comment on joue</h2>
        <button type="button" className="fgPrimary" onClick={onPlay}>
          C&apos;est parti
        </button>
      </div>
      <div className="fgCols">
        <div className="fgCard">
          <p className="fgEyebrow">Les règles</p>
          <ul>
            <li>Une nouvelle affiche chaque lundi. Un cercle s&apos;ouvre dessus et grandit : elle est entière au bout de 50 secondes.</li>
            <li>
              Deux façons de jouer : <b>compétitif</b>, avec chrono et classement de la semaine, ou <b>zen</b>, sans chrono ni
              classement.
            </li>
            <li>En compétitif, le chrono part dès que tu choisis le mode, et il continue si tu quittes la page. Le plus rapide gagne.</li>
            <li>Essais illimités, mais chaque erreur coûte du temps : 1 seconde, puis 3, puis 5 secondes à chaque nouvelle erreur.</li>
            <li>Au bout de 2 minutes, la partie s&apos;arrête. Abandonner compte aussi pour 2 minutes.</li>
            <li>Une partie par semaine et par pseudo Letterboxd. En compétitif, ton pseudo apparaît dans le classement de la semaine.</li>
          </ul>
        </div>
        <div className="fgCard">
          <p className="fgEyebrow">Bonus et badges</p>
          <ul>
            <li>Tu as joué toutes les semaines du mois ? Une affiche bonus, plus difficile, s&apos;ouvre le dernier vendredi du mois.</li>
            <li>Le classement est celui de la semaine, et seulement de la semaine.</li>
            <li>Sur plusieurs semaines, il n&apos;y a que des badges : le meilleur temps moyen du mois en compétitif, et la série de 4 semaines d&apos;affilée.</li>
            <li>Les parties en mode zen comptent pour ouvrir le bonus et pour la série.</li>
          </ul>
        </div>
      </div>
      <div className="fgFaq">
        <details>
          <summary>Je dois écrire le titre exact ?</summary>
          <p>
            Non. Le titre français et le titre original sont acceptés, sans accents ni majuscules, avec ou sans « le », « la »,
            « the ». Les numéros doivent être justes : « Toy Story 2 » n&apos;est pas « Toy Story 3 ». Le plus simple reste de
            choisir dans la liste qui s&apos;affiche.
          </p>
        </details>
        <details>
          <summary>Et si je quitte la page ?</summary>
          <p>
            En mode compétitif, le chrono continue de tourner et l&apos;affiche continue de se dévoiler. Tu peux revenir finir ta
            partie, mais le temps passé dehors compte. En mode zen, rien ne presse.
          </p>
        </details>
        <details>
          <summary>Combien de temps pour jouer la semaine ?</summary>
          <p>Du lundi au dimanche soir. Le bonus du mois reste ouvert jusqu&apos;à la fin du week-end où il sort.</p>
        </details>
        <details>
          <summary>Comment les films sont-ils choisis ?</summary>
          <p>
            Chaque semaine, un film parmi les plus vus sur Letterboxd (plus de 1,8 million de membres l&apos;ont vu), tous genres
            et toutes époques, avec au moins un film non anglophone par mois. Jamais deux fois le même cinéaste ni la même saga.
            Le bonus pioche parmi des films très bien notés, un peu moins vus. Les affiches viennent de TMDB, dans leur version
            sans texte.
          </p>
        </details>
      </div>
    </section>
  );
}

export default function Fiftyguess() {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [selected, setSelected] = useState(0);
  const [titles, setTitles] = useState<string[]>([]);
  const [guess, setGuess] = useState("");
  const [cursor, setCursor] = useState(-1);
  const [flash, setFlash] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [now, setNow] = useState(0); // secondes de jeu affichées (horloge locale recalée sur le serveur)
  const [copied, setCopied] = useState(false);
  const [posterReady, setPosterReady] = useState(0); // redessine une fois l'image arrivée
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originRef = useRef(0); // performance.now() correspondant à 0 s de jeu
  const busy = useRef(false);
  const fetchedAt = useRef(0); // performance.now() au moment où le serveur a donné les chronos

  const load = useCallback(() => {
    fetch("/api/game")
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data: GameState) => {
        fetchedAt.current = performance.now();
        setState(data);
      })
      .catch(() => setError("Le jeu n'a pas pu être chargé. Réessaie dans un instant."));
  }, []);

  const round = state?.rounds[selected] ?? null;
  const play = round?.play ?? null;
  const running = Boolean(play && !play.outcome);
  const compet = play?.mode === "compet";

  const apply = useCallback((next: GameRound) => {
    setState((current) => (current ? { ...current, rounds: current.rounds.map((r) => (r.id === next.id ? { ...r, ...next } : r)) } : current));
    if (next.play?.elapsed != null) originRef.current = performance.now() - next.play.elapsed * 1000;
  }, []);

  useEffect(() => {
    try {
      setShowRules(localStorage.getItem(RULES_KEY) !== "1");
    } catch {
      setShowRules(true);
    }
    load();
    fetch("/api/game/titles")
      .then((response) => (response.ok ? response.json() : []))
      .then(setTitles)
      .catch(() => setTitles([]));
  }, [load]);

  // Partie en cours au chargement (ou en changeant d'affiche) : on recale l'horloge sur le serveur.
  const loaded = Boolean(state);
  useEffect(() => {
    const elapsed = state?.rounds[selected]?.play?.elapsed;
    if (elapsed != null) originRef.current = fetchedAt.current - elapsed * 1000;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seulement au chargement et au changement d'affiche
  }, [selected, loaded]);

  // L'affiche n'arrive qu'une fois la partie lancée.
  useEffect(() => {
    imageRef.current = null;
    if (!round?.poster) return;
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setPosterReady((n) => n + 1);
    };
    image.src = round.poster.url;
  }, [round?.poster]);

  const draw = useCallback(
    (seconds: number, full = false) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#283246";
      ctx.fillRect(0, 0, W, H);
      const image = imageRef.current;
      if (!round?.poster || !image) return;
      const reveal = state?.reveal ?? 50;
      const p = full ? 1 : Math.min(1, seconds / reveal);
      const fx = round.poster.focus_x * W;
      const fy = round.poster.focus_y * H;
      const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - fx, y - fy)));
      const radius = 16 + (far - 16) * Math.pow(p, 1.25);
      ctx.save();
      ctx.beginPath();
      ctx.arc(fx, fy, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(image, 0, 0, W, H);
      ctx.restore();
      if (p < 1) {
        ctx.strokeStyle = "rgba(240, 164, 58, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fx, fy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    // posterReady : redessiner quand l'image arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round?.poster, state?.reveal, posterReady],
  );

  const send = useCallback(
    async (body: Record<string, unknown>) => {
      if (!round || busy.current) return null;
      busy.current = true;
      try {
        const response = await fetch("/api/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roundId: round.id, ...body }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Action impossible.");
          return null;
        }
        apply(data);
        if (data.play?.outcome) load(); // classement de la semaine à jour
        return data as GameRound;
      } finally {
        busy.current = false;
      }
    },
    [round, apply, load],
  );

  // Horloge : le cercle grandit avec le temps de jeu ; à 2:00 en compétitif, le serveur clôt la partie.
  useEffect(() => {
    if (!running) {
      draw(0, Boolean(play?.outcome));
      return;
    }
    let raf = 0;
    const tick = () => {
      const seconds = (performance.now() - originRef.current) / 1000;
      setNow(seconds);
      draw(seconds);
      if (compet && seconds + (play?.penalty ?? 0) >= (state?.cap ?? 120)) {
        send({ action: "tick" });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, compet, play?.penalty, play?.outcome, state?.cap, draw, send]);

  const suggestions =
    norm(guess).trim().length >= 2 ? titles.filter((title) => norm(title).includes(norm(guess).trim())).slice(0, 8) : [];

  async function submit(value: string) {
    if (!value.trim() || !running) return;
    const data = await send({ action: "guess", guess: value });
    setGuess("");
    setCursor(-1);
    if (data?.wrongGuess) {
      setShake(false);
      requestAnimationFrame(() => setShake(true));
      if (data.added) {
        setFlash(`+${data.added} s`);
        setTimeout(() => setFlash(null), 1500);
      }
    }
  }

  function closeRules() {
    try {
      localStorage.setItem(RULES_KEY, "1");
    } catch {
      /* sans stockage, les règles se réafficheront : pas grave */
    }
    setShowRules(false);
  }

  const share =
    round?.answer && play
      ? `Fiftyguess · semaine du ${frenchDate(round.opens_on)}\n${
          play.outcome !== "found" ? "Pas trouvé cette fois" : compet ? `Trouvé en ${clock(play.score ?? 0)}${play.wrong ? ` (${play.wrong} erreur${play.wrong > 1 ? "s" : ""})` : " du premier coup"}` : "Trouvé en mode zen"
        }\n50films.fr/jeu`
      : "";

  return (
    <div className="fgShell">
      <div className="fgTop">
        <h1 className="diversTitle">Fiftyguess</h1>
        <div className="fgLinks">
          <button type="button" className="fgLink" aria-pressed={showRules} onClick={() => (showRules ? closeRules() : setShowRules(true))}>
            Règles
          </button>
        </div>
      </div>

      {error ? <p className="fgError">{error}</p> : null}

      {showRules ? (
        <Rules onPlay={closeRules} />
      ) : !state ? (
        <p className="fgMuted">Chargement…</p>
      ) : !state.rounds.length ? (
        <p className="fgMuted">Pas d&apos;affiche cette semaine. Reviens lundi.</p>
      ) : (
        <>
          {state.rounds.length > 1 ? (
            <div className="fgRoundTabs" role="group" aria-label="Affiches ouvertes">
              {state.rounds.map((r, index) => (
                <button key={r.id} type="button" aria-pressed={index === selected} onClick={() => setSelected(index)}>
                  {r.kind === "bonus" ? "Bonus du mois" : "Affiche de la semaine"}
                </button>
              ))}
            </div>
          ) : null}

          <div className="fgGame">
            <div className="fgStage">
              <canvas ref={canvasRef} width={W} height={H} aria-label="Affiche qui se dévoile" />
              {!play && round ? (
                <div className="fgCover">
                  {!state.username ? (
                    <>
                      <p className="fgEyebrow">Pour jouer</p>
                      <p>Lance d&apos;abord ton wrapped depuis ce navigateur : c&apos;est lui qui prouve que le pseudo est le tien.</p>
                      <Link className="fgPrimary" href="/">
                        Mon wrapped
                      </Link>
                    </>
                  ) : round.locked ? (
                    <>
                      <p className="fgEyebrow">Bonus du mois</p>
                      <p>Il s&apos;ouvre quand tu as joué toutes les affiches de la semaine du mois.</p>
                    </>
                  ) : (
                    <>
                      <p className="fgEyebrow">Choisis ton mode</p>
                      <button type="button" className="fgPrimary" onClick={() => send({ action: "start", mode: "compet" })}>
                        Mode compétitif<small>{round.kind === "bonus" ? "avec chrono" : "avec chrono, classé dans la semaine"}</small>
                      </button>
                      <button type="button" className="fgGhost" onClick={() => send({ action: "start", mode: "zen" })}>
                        Mode zen<small>sans chrono, sans classement</small>
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <div className="fgPanel">
              <p className="fgMuted">
                {round?.kind === "bonus" ? "Bonus du mois" : `Semaine du ${round ? frenchDate(round.opens_on) : ""}`}
              </p>
              {play?.mode !== "zen" ? (
                <div className="fgClockRow">
                  <span className="fgClock">{clock(play?.outcome ? play.score ?? 0 : running ? now + (play?.penalty ?? 0) : 0)}</span>
                  <span className={`fgFlash${flash ? " isOn" : ""}`} aria-live="polite">
                    {flash}
                  </span>
                </div>
              ) : null}
              {running && compet ? <p className="fgWarn">Attention : si tu quittes la page, le chrono continue de tourner.</p> : null}

              {running ? (
                <>
                  <div className="fgGuess">
                    <label htmlFor="fg-answer" className="fgMuted">
                      Ta réponse (titre français ou original)
                    </label>
                    <input
                      id="fg-answer"
                      className={shake ? "isWrong" : ""}
                      autoComplete="off"
                      placeholder="Commence à taper un titre…"
                      role="combobox"
                      aria-expanded={suggestions.length > 0}
                      aria-controls="fg-suggestions"
                      value={guess}
                      onAnimationEnd={() => setShake(false)}
                      onChange={(event) => {
                        setGuess(event.target.value);
                        setCursor(-1);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown") {
                          setCursor((c) => Math.min(suggestions.length - 1, c + 1));
                          event.preventDefault();
                        } else if (event.key === "ArrowUp") {
                          setCursor((c) => Math.max(-1, c - 1));
                          event.preventDefault();
                        } else if (event.key === "Enter") {
                          event.preventDefault();
                          submit(cursor >= 0 ? suggestions[cursor] : guess);
                        }
                      }}
                    />
                    {suggestions.length ? (
                      <ul id="fg-suggestions" className="fgSuggest" role="listbox">
                        {suggestions.map((title, index) => (
                          <li
                            key={title}
                            role="option"
                            aria-selected={index === cursor}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              submit(title);
                            }}
                          >
                            {title}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  {compet ? (
                    <p className="fgMuted">
                      {play?.wrong
                        ? `${play.wrong} erreur${play.wrong > 1 ? "s" : ""} · +${play.penalty} s au total`
                        : "Essais illimités. Erreurs : +1 s, puis +3 s, puis +5 s à chaque fois."}
                    </p>
                  ) : null}
                  <div>
                    <button type="button" className="fgGhost" onClick={() => send({ action: "giveup" })}>
                      J&apos;abandonne
                    </button>
                  </div>
                </>
              ) : null}

              {round?.answer && play?.outcome ? (
                <div className="fgResult">
                  <p className="fgEyebrow">
                    {play.mode === "zen"
                      ? play.outcome === "found"
                        ? "Trouvé · mode zen"
                        : "Abandon · mode zen"
                      : { found: "Trouvé", giveup: "Abandon · compté 2:00", time: "Temps écoulé · compté 2:00" }[play.outcome]}
                  </p>
                  <h3>
                    {round.answer.title_fr}
                    {round.answer.title_orig !== round.answer.title_fr ? ` (${round.answer.title_orig})` : ""}
                    {round.answer.year ? `, ${round.answer.year}` : ""}
                  </h3>
                  {round.answer.director ? <p className="fgMuted">{round.answer.director}</p> : null}
                  {round.answer.slug ? (
                    <a href={`https://letterboxd.com/film/${round.answer.slug}/`} target="_blank" rel="noreferrer">
                      ↗ Letterboxd
                    </a>
                  ) : null}
                  <pre className="fgShare">{share}</pre>
                  <button
                    type="button"
                    className="fgGhost"
                    onClick={() =>
                      navigator.clipboard.writeText(share).then(
                        () => setCopied(true),
                        () => setCopied(false),
                      )
                    }
                  >
                    {copied ? "Copié" : "Copier le résultat"}
                  </button>
                </div>
              ) : null}

              {round?.kind === "week" ? (
                <div>
                  <h3 className="fgBoardTitle">Classement de la semaine</h3>
                  {round.leaderboard?.length ? (
                    <ol className="fgBoard">
                      {round.leaderboard.map((row, index) => (
                        <li key={row.username} className={row.username.toLowerCase() === state.username ? "isMe" : ""}>
                          <span>{index + 1}</span>
                          <span>{row.username}</span>
                          <span>{row.outcome === "found" ? clock(row.score) : "—"}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="fgMuted">Personne n&apos;a encore joué en compétitif cette semaine.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
