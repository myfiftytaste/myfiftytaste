"use client";

import worldTopology from "world-atlas/countries-110m.json";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { useRef, useState, type MouseEvent } from "react";

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

const iso2ToNumeric: Record<string, string> = {
  BE: "056",
  CA: "124",
  CH: "756",
  CN: "156",
  DE: "276",
  ES: "724",
  FR: "250",
  GB: "826",
  IE: "372",
  IT: "380",
  JP: "392",
  KR: "410",
  NG: "566",
  SE: "752",
  US: "840",
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
  const alpha = 0.14 + safe * 0.6;
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

export default function WorldMap({ countryMap }: { countryMap?: CountryMapData }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    country: CountryMapEntry;
    x: number;
    y: number;
  } | null>(null);
  const countries = countryMap?.countries ?? [];
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

  const byNumericId = new Map(
    countries
      .filter((country) => country.iso2 && iso2ToNumeric[country.iso2])
      .map((country) => [iso2ToNumeric[country.iso2 as string], country]),
  );
  const topCountries = countries.slice(0, 8);

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
          <svg
            aria-label="Pays de production des films du profil"
            className="world-map-svg"
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            role="img"
          >
            {worldFeatures.map((shape) => {
              const numericId = normalizeNumericId(shape.id);
              const data = byNumericId.get(numericId);
              const countryName = data?.name || shape.properties?.name || numericId;
              const countryLabel = data
                ? `${data.name}: ${data.count} (${formatPercent(data.share)})`
                : countryName;
              return (
                <path
                  aria-label={countryLabel}
                  className={data ? "world-country world-country-active" : "world-country"}
                  data-country={countryName}
                  data-count={data?.count}
                  d={featurePath(shape)}
                  fill={data ? fillFor(data.intensity) : "rgba(247, 238, 220, 0.018)"}
                  key={numericId || shape.properties?.name}
                  onClick={data ? (event) => showTooltip(data, event) : undefined}
                  onMouseEnter={data ? (event) => showTooltip(data, event) : undefined}
                  onMouseLeave={data ? () => setTooltip(null) : undefined}
                  onMouseMove={data ? moveTooltip : undefined}
                />
              );
            })}
          </svg>
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

        <div className="world-map-list">
          {topCountries.map((country) => (
            <div className="country-row" key={`${country.iso2}-${country.name}`}>
              <span>{country.name}</span>
              <strong>{country.count}</strong>
              <small>{formatPercent(country.share)}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
