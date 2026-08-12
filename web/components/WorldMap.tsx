"use client";

import worldTopology from "world-atlas/countries-110m.json";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";

type CountryMapEntry = {
  name: string;
  iso2: string | null;
  count: number;
  share: number | null;
  intensity: number;
  films?: {
    title?: string | null;
    year?: number | string | null;
    slug?: string | null;
  }[];
};

type CountryMapData = {
  title?: string;
  subtitle?: string;
  countries?: CountryMapEntry[];
  max_count?: number;
  total_country_tags?: number;
};

type CountryFeature = {
  id?: string | number;
  properties?: {
    name?: string;
  };
  type: "Feature";
  geometry?: GeoJSON.Geometry;
};

// Full ISO 3166-1 alpha-2 -> numeric table, so any country the backend sends
// resolves to a map shape (a partial table previously dropped countries like
// Brazil silently: they'd have data but never render or highlight).
const iso2ToNumeric: Record<string, string> = {
  AD: "020", AE: "784", AF: "004", AG: "028", AI: "660", AL: "008", AM: "051", AO: "024", AQ: "010", AR: "032",
  AS: "016", AT: "040", AU: "036", AW: "533", AX: "248", AZ: "031",
  BA: "070", BB: "052", BD: "050", BE: "056", BF: "854", BG: "100", BH: "048", BI: "108", BJ: "204", BL: "652",
  BM: "060", BN: "096", BO: "068", BQ: "535", BR: "076", BS: "044", BT: "064", BV: "074", BW: "072", BY: "112", BZ: "084",
  CA: "124", CC: "166", CD: "180", CF: "140", CG: "178", CH: "756", CI: "384", CK: "184", CL: "152", CM: "120",
  CN: "156", CO: "170", CR: "188", CU: "192", CV: "132", CW: "531", CX: "162", CY: "196", CZ: "203",
  DE: "276", DJ: "262", DK: "208", DM: "212", DO: "214", DZ: "012",
  EC: "218", EE: "233", EG: "818", EH: "732", ER: "232", ES: "724", ET: "231",
  FI: "246", FJ: "242", FK: "238", FM: "583", FO: "234", FR: "250",
  GA: "266", GB: "826", GD: "308", GE: "268", GF: "254", GG: "831", GH: "288", GI: "292", GL: "304", GM: "270",
  GN: "324", GP: "312", GQ: "226", GR: "300", GS: "239", GT: "320", GU: "316", GW: "624", GY: "328",
  HK: "344", HM: "334", HN: "340", HR: "191", HT: "332", HU: "348",
  ID: "360", IE: "372", IL: "376", IM: "833", IN: "356", IO: "086", IQ: "368", IR: "364", IS: "352", IT: "380",
  JE: "832", JM: "388", JO: "400", JP: "392",
  KE: "404", KG: "417", KH: "116", KI: "296", KM: "174", KN: "659", KP: "408", KR: "410", KW: "414", KY: "136", KZ: "398",
  LA: "418", LB: "422", LC: "662", LI: "438", LK: "144", LR: "430", LS: "426", LT: "440", LU: "442", LV: "428", LY: "434",
  MA: "504", MC: "492", MD: "498", ME: "499", MF: "663", MG: "450", MH: "584", MK: "807", ML: "466", MM: "104",
  MN: "496", MO: "446", MP: "580", MQ: "474", MR: "478", MS: "500", MT: "470", MU: "480", MV: "462", MW: "454",
  MX: "484", MY: "458", MZ: "508",
  NA: "516", NC: "540", NE: "562", NF: "574", NG: "566", NI: "558", NL: "528", NO: "578", NP: "524", NR: "520",
  NU: "570", NZ: "554",
  OM: "512",
  PA: "591", PE: "604", PF: "258", PG: "598", PH: "608", PK: "586", PL: "616", PM: "666", PN: "612", PR: "630",
  PS: "275", PT: "620", PW: "585", PY: "600",
  QA: "634",
  RE: "638", RO: "642", RS: "688", RU: "643", RW: "646",
  SA: "682", SB: "090", SC: "690", SD: "729", SE: "752", SG: "702", SH: "654", SI: "705", SJ: "744", SK: "703",
  SL: "694", SM: "674", SN: "686", SO: "706", SR: "740", SS: "728", ST: "678", SV: "222", SX: "534", SY: "760", SZ: "748",
  TC: "796", TD: "148", TF: "260", TG: "768", TH: "764", TJ: "762", TK: "772", TL: "626", TM: "795", TN: "788",
  TO: "776", TR: "792", TT: "780", TV: "798", TW: "158", TZ: "834",
  UA: "804", UG: "800", UM: "581", US: "840", UY: "858", UZ: "860",
  VA: "336", VC: "670", VE: "862", VG: "092", VI: "850", VN: "704", VU: "548",
  WF: "876", WS: "882",
  YE: "887", YT: "175",
  ZA: "710", ZM: "894", ZW: "716",
};

const topology = worldTopology as unknown as {
  objects: {
    countries: unknown;
  };
};

const countriesFeatureCollection = feature(
  topology as never,
  topology.objects.countries as never,
) as unknown as { features: CountryFeature[] };

const worldFeatures = countriesFeatureCollection.features.filter(
  (item) => item.id !== "010" && item.geometry,
);

const mapWidth = 960;
const mapHeight = 460;
const projection = geoNaturalEarth1().fitSize(
  [mapWidth, mapHeight],
  {
    type: "FeatureCollection",
    features: worldFeatures as GeoJSON.Feature[],
  },
);
const pathGenerator = geoPath(projection);

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${Math.round(value * 100)}%`;
}

function fillFor(intensity: number | undefined) {
  const safe = Math.max(0, Math.min(1, intensity ?? 0));
  const alpha = 0.2 + safe * 0.56;
  return `rgba(217, 164, 65, ${alpha})`;
}

function normalizeNumericId(id: string | number | undefined) {
  if (id === undefined) {
    return "";
  }
  return String(id).padStart(3, "0");
}

function featurePath(country: CountryFeature) {
  return pathGenerator(country as GeoJSON.Feature) || "";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function countryKey(country: CountryMapEntry) {
  return country.iso2 ?? country.name;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function WorldMap({ countryMap }: { countryMap?: CountryMapData }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [tooltip, setTooltip] = useState<{
    country: CountryMapEntry;
    x: number;
    y: number;
  } | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const dropTimeoutRef = useRef<number | undefined>(undefined);
  const countries = useMemo(() => countryMap?.countries ?? [], [countryMap]);

  // Drops the colored countries onto the map every time the panel re-enters
  // view (scroll-triggered only, replays on re-entry, never on hover — same
  // safe pattern as the genre bubbles: isDropping is plain state, so a
  // hover-triggered tooltip re-render can never resurrect the class).
  useEffect(() => {
    const node = panelRef.current;
    if (!node || countries.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const activeCount = Math.min(countries.length, 7);
    const totalDuration = 1400 + (activeCount - 1) * 90 + 150;

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
  }, [countries.length]);

  // Slides each country bar in proportionally to its share, replaying on
  // every re-entry like the rest of the site's one-shot animations.
  useEffect(() => {
    const node = listRef.current;
    if (!node || countries.length === 0) return;

    const barCountries = countries.slice(0, 7);
    const targets = barCountries.map((country) => clamp((country.share ?? 0) * 100, 0, 100));
    const keys = barCountries.map((country) => country.iso2 ?? country.name);

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
  }, [countries]);

  if (countries.length === 0) {
    return (
      <section className="world-map-section" aria-label="Passeport cinéma">
        <div className="sectionHeading">
          <p className="eyebrow">PASSEPORT</p>
          <h2>Ma carte</h2>
          <p>Country data unavailable</p>
        </div>
      </section>
    );
  }

  const topCountries = countries.slice(0, 7);
  const byNumericId = new Map(
    topCountries
      .filter((country) => country.iso2 && iso2ToNumeric[country.iso2])
      .map((country) => [iso2ToNumeric[country.iso2 as string], country]),
  );
  const rankByName = new Map(topCountries.map((country, index) => [country.name, index]));

  function tooltipPosition(clientX: number, clientY: number) {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }

    const tooltipWidth = Math.min(260, Math.max(0, rect.width - 24));
    const tooltipHeight = Math.min(210, Math.max(0, rect.height - 24));
    const offsetX = 14;
    const offsetY = 14;
    const rawX = clientX - rect.left + offsetX;
    const rawY = clientY - rect.top + offsetY;

    return {
      x: Math.max(12, Math.min(rawX, rect.width - tooltipWidth)),
      y: Math.max(12, Math.min(rawY, rect.height - tooltipHeight)),
    };
  }

  function showTooltip(country: CountryMapEntry, event: MouseEvent<SVGPathElement>) {
    const { clientX, clientY } = event;
    setTooltip({
      country,
      ...tooltipPosition(clientX, clientY),
    });
  }

  function moveTooltip(event: MouseEvent<SVGPathElement>) {
    const { clientX, clientY } = event;
    setTooltip((current) =>
      current ? { ...current, ...tooltipPosition(clientX, clientY) } : current,
    );
  }

  function enterCountry(country: CountryMapEntry, event: MouseEvent<SVGPathElement>) {
    showTooltip(country, event);
    setHoveredCountry(countryKey(country));
  }

  function leaveCountry() {
    setTooltip(null);
    setHoveredCountry(null);
  }

  return (
    <section className="world-map-section" aria-label="Passeport cinéma">
      <div className="sectionHeading">
        <p className="eyebrow">PASSEPORT</p>
        <h2>{countryMap?.title || "Ma carte"}</h2>
        <p>
          {countryMap?.subtitle ||
            "Nationalité des productions de tes 50 derniers films"}
        </p>
      </div>

      <div className="world-map-card">
        <div className="world-map-panel" ref={panelRef}>
          <div className="world-map-svg-wrap">
          <svg
            aria-label="Pays de production des films du profil"
            className="world-map-svg"
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
          >
            {worldFeatures.map((shape) => {
              const numericId = normalizeNumericId(shape.id);
              const data = byNumericId.get(numericId);
              const countryName = data?.name || shape.properties?.name || numericId;
              const countryLabel = data
                ? `${data.name}: ${data.count} (${formatPercent(data.share)})`
                : countryName;
              const rank = data ? rankByName.get(data.name) ?? 0 : 0;
              const dropStyle = data
                ? ({ "--country-delay": `${Math.min(rank, 6) * 90}ms` } as CSSProperties)
                : undefined;
              const isHovered = data ? hoveredCountry === countryKey(data) : false;
              return (
                <path
                  aria-label={countryLabel}
                  className={
                    data
                      ? `world-country world-country-active${isDropping ? " world-country-drop" : ""}${isHovered ? " world-country-hovered" : ""}`
                      : "world-country"
                  }
                  data-country={countryName}
                  data-count={data?.count}
                  d={featurePath(shape)}
                  fill={data ? fillFor(data.intensity) : "rgba(120, 117, 110, 0.12)"}
                  key={numericId || shape.properties?.name}
                  style={dropStyle}
                  onClick={data ? (event) => enterCountry(data, event) : undefined}
                  onMouseEnter={data ? (event) => enterCountry(data, event) : undefined}
                  onMouseLeave={data ? leaveCountry : undefined}
                  onMouseMove={data ? moveTooltip : undefined}
                />
              );
            })}
          </svg>
          </div>
          {tooltip ? (
            <div className="world-map-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
              <strong>{tooltip.country.name}</strong>
              <span>
                {tooltip.country.count} {tooltip.country.count > 1 ? "occurrences" : "occurrence"}
              </span>
              {tooltip.country.films?.length ? (
                <ul>
                  {tooltip.country.films.slice(0, 6).map((film) => (
                    <li key={`${film.slug}-${film.title}`}>
                      {film.title}
                      {film.year ? <em>{film.year}</em> : null}
                    </li>
                  ))}
                  {tooltip.country.films.length > 6 ? (
                    <li className="world-map-tooltip-more">
                      + {tooltip.country.films.length - 6} autres
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}
          <div className="world-map-legend" aria-hidden="true">
            <p>Origine de tes 50 derniers films</p>
            <div className="world-map-legend-scale">
              <span>0 %</span>
              <div />
              <span>100 %</span>
            </div>
          </div>
        </div>

        <div className="world-map-list" ref={listRef}>
          {topCountries.map((country) => {
            const key = countryKey(country);
            return (
              <div
                className={`country-bar-row${hoveredCountry === key ? " country-bar-row-linked" : ""}`}
                key={key}
                onMouseEnter={() => setHoveredCountry(key)}
                onMouseLeave={() => setHoveredCountry(null)}
              >
                <div className="country-bar-heading">
                  <span>{country.name}</span>
                  <span className="country-bar-meta">
                    <strong>{country.count}</strong>
                    <small>{formatPercent(country.share)}</small>
                  </span>
                </div>
                <div className="country-bar-track">
                  <div
                    className="country-bar-fill"
                    ref={(el) => {
                      if (el) barRefs.current.set(key, el);
                      else barRefs.current.delete(key);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
