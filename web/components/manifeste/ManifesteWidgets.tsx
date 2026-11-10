"use client";

import { useEffect, useMemo, useState } from "react";
import RuntimeFilmstrip from "../RuntimeFilmstrip";
import SeverityGauge from "../SeverityGauge";
import {
  AGE_CUTS,
  RANK_TO_VIEWS,
  REFERENCE_AGES,
  REFERENCE_MEDIAN_VIEWS,
  REFERENCE_REVIEW_COUNTS,
  REVIEW_CUTS,
  VIEW_CUTS,
  comparisonShare,
  type Era,
} from "../../lib/manifesteMath";

// Schémas vivants du Manifeste (aperçu du 10/11/2026). Chaque schéma rejoue une règle de calcul
// réelle de Fifty avec des valeurs que le lecteur fait varier ; les constantes viennent de
// lib/manifesteMath.ts, copie de scripts/mainstream_estimate.py.

const fr = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

function views(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (value >= 1000) return `${Math.round(value / 1000)} k`;
  return String(Math.round(value));
}

/* --- 1. La jauge Sévère / Indulgent --------------------------------------------------- */

const GAUGE_FILMS = [
  { title: "Paris, Texas", community: 4.25, start: 4.5 },
  { title: "Chronicle", community: 3.13, start: 2.5 },
  { title: "The Intouchables", community: 3.85, start: 3 },
  { title: "Melancholia", community: 3.63, start: 4 },
];

export function GaugeDemo() {
  const [ratings, setRatings] = useState(GAUGE_FILMS.map((film) => film.start));
  const you = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
  const community = GAUGE_FILMS.reduce((sum, film) => sum + film.community, 0) / GAUGE_FILMS.length;
  const gap = you - community;
  const verdict = Math.abs(gap) < 0.1 ? "Juste" : gap < 0 ? "Sévère" : "Indulgent";
  return (
    <div className="mfWidget">
      <p className="mfWidgetHint">Change tes notes : les billes et le verdict suivent.</p>
      <ul className="mfGaugeFilms">
        {GAUGE_FILMS.map((film, index) => (
          <li key={film.title}>
            <span className="mfGaugeTitle">{film.title}</span>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.5}
              value={ratings[index]}
              aria-label={`Ta note pour ${film.title}`}
              onChange={(event) =>
                setRatings((current) => current.map((value, i) => (i === index ? Number(event.target.value) : value)))
              }
            />
            <span className="mfGaugeYou">★ {String(ratings[index]).replace(".", ",")}</span>
            <span className="mfGaugeCommunity">Letterboxd {fr.format(film.community)}</span>
          </li>
        ))}
      </ul>
      <div className="mfVerdict">
        <b>{verdict}</b>
        <span>
          écart moyen {gap > 0 ? "+" : ""}
          {fr.format(gap)} étoile
        </span>
      </div>
      <SeverityGauge card={{ value: gap.toFixed(3), user_average: you.toFixed(3), community_average: community.toFixed(3) } as never} />
    </div>
  );
}

/* --- 2. La durée ---------------------------------------------------------------------- */

export function RuntimeDemo({ scale }: { scale: { average: number; low: number; high: number } }) {
  const [minutes, setMinutes] = useState(101);
  return (
    <div className="mfWidget">
      <p className="mfWidgetHint">Fais glisser ta durée moyenne : la pellicule se remplit par rapport aux profils Fifty.</p>
      <input
        type="range"
        className="mfWide"
        min={80}
        max={150}
        value={minutes}
        aria-label="Durée moyenne de tes films, en minutes"
        onChange={(event) => setMinutes(Number(event.target.value))}
      />
      <RuntimeFilmstrip
        variant="hero"
        averageMinutes={minutes}
        scale={scale}
        card={{ title: "Durée moyenne", value: `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`, description: "La durée moyenne de tes films", data_source: "" } as never}
      />
    </div>
  );
}

/* --- 3. Le film médian ---------------------------------------------------------------- */

const MEDIAN_FILMS = [
  8_000, 21_000, 34_000, 52_000, 70_000, 96_000, 130_000, 173_000, 220_000, 260_000, 340_000, 520_000, 760_000,
  1_100_000, 1_900_000,
];
const BLOCKBUSTERS = [3_400_000, 4_100_000, 4_800_000];

export function MedianDemo() {
  const [extra, setExtra] = useState(0);
  const films = useMemo(() => [...MEDIAN_FILMS, ...BLOCKBUSTERS.slice(0, extra)].sort((a, b) => a - b), [extra]);
  const logs = films.map((value) => Math.log10(value));
  const sorted = [...logs].sort((a, b) => a - b);
  const mid = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const median = 10 ** mid;
  const mean = films.reduce((sum, value) => sum + value, 0) / films.length;
  const x = (value: number) => ((Math.log10(value) - 3.5) / (7 - 3.5)) * 100;
  return (
    <div className="mfWidget">
      <p className="mfWidgetHint">Chaque point est un film, rangé de moins vu à plus vu. Ajoute des blockbusters.</p>
      <div className="mfMedianAxis" role="img" aria-label={`Film médian à ${views(median)} vues, moyenne à ${views(mean)} vues`}>
        {films.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className={`mfDot${BLOCKBUSTERS.includes(value) ? " mfDotBig" : ""}`}
            style={{ left: `${x(value)}%` }}
          />
        ))}
        <span className="mfMarker mfMarkerMedian" style={{ left: `${x(median)}%` }}>
          <em>médian</em>
        </span>
        <span className="mfMarker mfMarkerMean" style={{ left: `${Math.min(x(mean), 100)}%` }}>
          <em>moyenne</em>
        </span>
        <span className="mfAxisLabel mfAxisLeft">peu vu</span>
        <span className="mfAxisLabel mfAxisRight">très vu</span>
      </div>
      <div className="mfRow">
        <button type="button" className="mfButton" onClick={() => setExtra((n) => Math.min(n + 1, BLOCKBUSTERS.length))} disabled={extra >= BLOCKBUSTERS.length}>
          + un blockbuster
        </button>
        <button type="button" className="mfButton mfButtonGhost" onClick={() => setExtra(0)} disabled={extra === 0}>
          Revenir
        </button>
      </div>
      <dl className="mfStats">
        <div>
          <dt>Film médian</dt>
          <dd>{views(median)} vues</dd>
        </div>
        <div>
          <dt>Moyenne</dt>
          <dd>{views(mean)} vues</dd>
        </div>
      </dl>
    </div>
  );
}

/* --- 4. Estimer les vues d'un film récent --------------------------------------------- */

const ERAS: { key: Era; label: string }[] = [
  { key: "pre1980", label: "avant 1980" },
  { key: "1980_99", label: "1980-1999" },
  { key: "2000_14", label: "2000-2014" },
  { key: "2015p", label: "2015 et après" },
];

export function EstimationDemo() {
  const [era, setEra] = useState<Era>("2015p");
  const [rank, setRank] = useState(40);
  const estimate = (key: Era, r: number) => 10 ** (RANK_TO_VIEWS[key][0] + RANK_TO_VIEWS[key][1] * Math.log10(r));
  // Graphe log-log : rang 1 à 1000 en abscisse, vues 1 k à 20 M en ordonnée.
  const px = (r: number) => 30 + (Math.log10(r) / 3) * 260;
  const py = (v: number) => 150 - ((Math.log10(Math.max(v, 1000)) - 3) / (7.3 - 3)) * 140;
  const curve = (key: Era) =>
    Array.from({ length: 31 }, (_, i) => 10 ** (i / 10))
      .map((r, i) => `${i ? "L" : "M"}${px(r).toFixed(1)},${py(estimate(key, r)).toFixed(1)}`)
      .join(" ");
  const value = estimate(era, rank);
  return (
    <div className="mfWidget">
      <p className="mfWidgetHint">Choisis l&apos;époque et le rang du film parmi les sorties de son année (votes TMDB).</p>
      <div className="mfChips" role="group" aria-label="Époque de sortie">
        {ERAS.map((item) => (
          <button key={item.key} type="button" className="mfChip" aria-pressed={era === item.key} onClick={() => setEra(item.key)}>
            {item.label}
          </button>
        ))}
      </div>
      <label className="mfSlider">
        <span>
          {rank === 1 ? "Le film le plus voté de son année" : `${rank}ᵉ film le plus voté de son année`}
        </span>
        <input type="range" min={0} max={300} value={Math.round(Math.log10(rank) * 100)} onChange={(event) => setRank(Math.round(10 ** (Number(event.target.value) / 100)))} />
      </label>
      <svg className="mfChart" viewBox="0 0 300 175" role="img" aria-label={`Vues estimées : ${views(value)}`}>
        {ERAS.map((item) => (
          <path key={item.key} d={curve(item.key)} className={item.key === era ? "mfCurve mfCurveOn" : "mfCurve"} />
        ))}
        <circle cx={px(rank)} cy={py(value)} r="5" className="mfPoint" />
        <line x1="30" y1="150" x2="290" y2="150" className="mfAxis" />
        <line x1="30" y1="10" x2="30" y2="150" className="mfAxis" />
        <text x="30" y="166" className="mfTick">1</text>
        <text x="117" y="166" className="mfTick">10</text>
        <text x="203" y="166" className="mfTick">100</text>
        <text x="290" y="166" className="mfTick" textAnchor="end">1000</text>
        <text x="290" y="142" className="mfTick" textAnchor="end">rang dans l&apos;année →</text>
        <text x="4" y="14" className="mfTick">vues</text>
      </svg>
      <dl className="mfStats">
        <div>
          <dt>Vues Letterboxd estimées</dt>
          <dd>{views(value)}</dd>
        </div>
        <div>
          <dt>Marge habituelle</dt>
          <dd>
            {views(value / 1.6)} à {views(value * 1.6)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/* --- 5. Les crans ---------------------------------------------------------------------- */

type Axis = "mainstream" | "epoque" | "reviews";

const AXES: Record<
  Axis,
  {
    label: string;
    min: number;
    max: number;
    log: boolean;
    cuts: readonly number[];
    reference: readonly number[];
    reversed: boolean;
    unit: (v: number) => string;
    more: string;
    less: string;
    relative: boolean;
  }
> = {
  mainstream: {
    label: "Mainstream",
    min: 30_000,
    max: 2_000_000,
    log: true,
    cuts: VIEW_CUTS,
    reference: REFERENCE_MEDIAN_VIEWS,
    reversed: false,
    unit: (v) => `film médian à ${views(v)} vues`,
    more: "Plus mainstream",
    less: "Moins mainstream",
    relative: true,
  },
  epoque: {
    label: "Époque",
    min: 3,
    max: 28,
    log: false,
    cuts: AGE_CUTS,
    reference: REFERENCE_AGES,
    reversed: true,
    unit: (v) => `âge moyen de tes films : ${v.toFixed(1).replace(".", ",")} ans`,
    more: "Plus nostalgique",
    less: "Moins nostalgique",
    relative: true,
  },
  reviews: {
    label: "Reviews",
    min: 0,
    max: 50,
    log: false,
    cuts: REVIEW_CUTS,
    reference: REFERENCE_REVIEW_COUNTS,
    reversed: false,
    unit: (v) => `${Math.round(v)} review${Math.round(v) > 1 ? "s" : ""} sur 50 films`,
    more: "Tu laisses plus de reviews",
    less: "Tu laisses moins de reviews",
    relative: false,
  },
};

export function CransDemo() {
  const [axis, setAxis] = useState<Axis>("mainstream");
  const config = AXES[axis];
  const [position, setPosition] = useState(0.45);
  useEffect(() => setPosition(axis === "reviews" ? 0.4 : 0.45), [axis]);
  const value = config.log
    ? 10 ** (Math.log10(config.min) + position * (Math.log10(config.max) - Math.log10(config.min)))
    : config.min + position * (config.max - config.min);
  const rounded = axis === "reviews" ? Math.round(value) : value;
  // Cran : mainstream et reviews montent avec la valeur ; l'époque monte quand l'âge baisse.
  const cran = config.reversed
    ? 1 + config.cuts.filter((cut) => rounded < cut).length
    : 1 + config.cuts.filter((cut) => rounded > cut).length;
  const share = comparisonShare(rounded, config.reference);
  // Pour l'époque, « plus nostalgique » = films plus vieux = valeur plus haute.
  const sentence = share >= 50 ? `${config.more} que ${share} % des profils Fifty` : `${config.less} que ${100 - share} % des profils Fifty`;
  const widths = config.relative ? [10, 20, 40, 20, 10] : [9, 9, 12, 13, 8]; // reviews : largeur des plages 0-8, 9-17…
  return (
    <div className="mfWidget">
      <div className="mfChips" role="group" aria-label="Axe du Triangle">
        {(Object.keys(AXES) as Axis[]).map((key) => (
          <button key={key} type="button" className="mfChip" aria-pressed={axis === key} onClick={() => setAxis(key)}>
            {AXES[key].label}
          </button>
        ))}
      </div>
      <div className="mfBands" aria-hidden="true">
        {widths.map((width, index) => (
          <span key={index} className={`mfBand${index + 1 === cran ? " mfBandOn" : ""}`} style={{ flexGrow: width }}>
            <b>{index + 1}</b>
            {config.relative ? <small>{width} %</small> : null}
          </span>
        ))}
      </div>
      <label className="mfSlider">
        <span>{config.unit(rounded)}</span>
        <input type="range" min={0} max={1} step={0.005} value={position} onChange={(event) => setPosition(Number(event.target.value))} />
      </label>
      <dl className="mfStats">
        <div>
          <dt>Ton cran</dt>
          <dd>{cran}/5</dd>
        </div>
        <div>
          <dt>Parmi les profils Fifty</dt>
          <dd className="mfSentence">{sentence}</dd>
        </div>
      </dl>
      <p className="mfWidgetNote">
        {config.relative
          ? "Les bandes ont la largeur de la part des profils Fifty qu'elles contiennent : 10, 20, 40, 20 et 10 %."
          : "Pour les reviews, les crans sont fixes : 0 à 8 reviews, 9 à 17, 18 à 29, 30 à 42, 43 à 50."}
      </p>
    </div>
  );
}

/* --- 6. Les recos ----------------------------------------------------------------------- */

const RECO_SLOTS = [
  {
    key: "pepite",
    name: "La Pépite",
    steps: ["Tes genres, pays et cinéastes", "Films proches, peu vus, sortis il y a 3 ans ou plus", "Moyenne Letterboxd ≥ 3,2 quand on la connaît", "Tirage parmi les 3 meilleurs, chaque mois"],
  },
  {
    key: "pari",
    name: "Le Pari",
    steps: ["Un genre que tu ne regardes presque jamais (< 5 %)", "…mais souvent associé à un genre que tu aimes", "Sorties des 24 derniers mois, les plus vues", "Tirage parmi les 5 meilleurs, chaque mois"],
  },
  {
    key: "detour",
    name: "Le Détour",
    steps: ["Un pays absent de tes 50 films", "Celui qu'ont aimé les profils Fifty qui te ressemblent", "Ses films les plus vus, dans tes genres", "Tirage parmi les 5 meilleurs, chaque mois"],
  },
];

export function RecoDemo() {
  const [open, setOpen] = useState("pari");
  const slot = RECO_SLOTS.find((item) => item.key === open) ?? RECO_SLOTS[1];
  return (
    <div className="mfWidget">
      <div className="mfChips" role="group" aria-label="Place de la reco">
        {RECO_SLOTS.map((item) => (
          <button key={item.key} type="button" className="mfChip" aria-pressed={open === item.key} onClick={() => setOpen(item.key)}>
            {item.name}
          </button>
        ))}
      </div>
      <ol className="mfFlow">
        {slot.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
        <li className="mfFlowEnd">Ta carte · jamais un film déjà proposé lors de tes 3 dernières générations</li>
      </ol>
    </div>
  );
}

/* --- 7. Le calendrier du Hall of Fame --------------------------------------------------- */

export function SeasonDemo() {
  const steps = [
    { day: "1ᵉʳ", text: "La saison s'ouvre. Ton premier passage du mois fige ton profil." },
    { day: "…", text: "Tu choisis de figurer ou non dans le classement. Tu peux te retirer à tout moment." },
    { day: "31", text: "La saison se termine." },
    { day: "1ᵉʳ", text: "Badges : il faut au moins 3 inscrits, et au moins 3 films pour un top continent." },
  ];
  return (
    <div className="mfWidget">
      <ol className="mfTimeline">
        {steps.map((step, index) => (
          <li key={index}>
            <b>{step.day}</b>
            <span>{step.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
