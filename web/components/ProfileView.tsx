"use client";

import Image from "next/image";
/* eslint-disable @next/next/no-img-element */
import AverageRatingCard from "./AverageRatingCard";
import GenreBubbles from "./GenreBubbles";
import HallOfFameCTA from "./hall-of-fame/HallOfFameCTA";
import HighlightsCarousel, { type Highlights } from "./HighlightsCarousel";
import LogTimeMini from "./LogTimeMini";
import RadarChart from "./RadarChart";
import DiscoveryTipCard from "./recap/DiscoveryTipCard";
import ProfileBadgesHeader from "./recap/ProfileBadgesHeader";
import Recommendations from "./Recommendations";
import RuntimeFilmstrip from "./RuntimeFilmstrip";
import SeverityGauge from "./SeverityGauge";
import WorldMap from "./WorldMap";
import { useVisualTheme } from "./VisualThemeProvider";
import type { Badge } from "../lib/badgeSelection";

export type Card = {
  id: string;
  title: string;
  value: string | null;
  label: string;
  description: string;
  confidence: "high" | "medium" | "low" | string;
  confidence_label?: string;
  data_source: string;
};

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

type CountryMap = {
  title?: string;
  subtitle?: string;
  countries?: {
    name: string;
    iso2: string | null;
    count: number;
    share: number | null;
    intensity: number;
  }[];
  max_count?: number;
  total_country_tags?: number;
};

type Recommendation = {
  slot: "safe_pick" | "deep_cut" | "wild_card" | string;
  title: string;
  year: number | null;
  slug: string;
  letterboxd_url?: string | null;
  score: number;
  reason_text: string;
  genres?: string[];
  countries?: string[];
  runtime?: number | null;
  average_rating?: number | null;
  director?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
};

type LogTimeProfile = {
  average_time?: string | null;
  average_hour_decimal?: number | null;
  period?: string | null;
  label?: string | null;
  description?: string | null;
  data_source?: string | null;
  confidence?: string | null;
};

export type DisplayProfile = {
  hero: {
    username: string;
    primary_archetype_id?: string;
    primary_archetype: string;
    subtitle: string;
    one_liner: string;
    social_coverage: number;
    metadata_coverage: number;
    detected_films_count?: number;
    target_films_count?: number;
    profile_quality_status?: string;
  };
  profile_quality?: {
    detected_films_count?: number;
    target_films_count?: number;
    status?: string;
    is_partial?: boolean;
    warning?: string | null;
  };
  average_rating_summary?: {
    value?: number | null;
    scale?: number;
    detected_films_count?: number;
    target_films_count?: number;
  };
  radar_scores?: {
    mainstreamness?: { value_5?: number; label?: string };
    oldness?: { value_5?: number; label?: string };
    endurance?: { value_5?: number; label?: string; raw_value?: number | null };
    reviewness?: { value_5?: number; label?: string };
  };
  radar_editorial?: {
    title?: string;
    subtitle?: string;
    axes?: Record<string, {
      axis_id?: string;
      technical_axis_id?: string;
      label?: string;
      title?: string;
      one_line?: string;
      one_liner?: string;
      cran?: number;
      image?: string | null;
      image_src?: string | null;
      illustration?: string | null;
    }>;
  };
  log_time_profile?: LogTimeProfile | null;
  genre_bubbles?: GenreBubble[];
  country_map?: CountryMap;
  recommendations?: Recommendation[];
  recommendations_status?: {
    available?: boolean;
    unavailable_reason?: string | null;
  };
  recommendations_copy?: {
    eyebrow?: string;
    title?: string;
    subtitle_template?: string;
    unavailable_text?: string;
    slot_labels?: Record<string, string>;
    slot_descriptions?: Record<string, string>;
  };
  highlights_copy?: {
    eyebrow?: string;
    title?: string;
    labels?: Record<string, string>;
  };
  cards_section?: {
    eyebrow?: string;
    title?: string;
  };
  cards: Card[];
  highlights: Highlights;
  warnings: string[];
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function ProfileView({ profile, badges = [] }: { profile: DisplayProfile; badges?: Badge[] }) {
  const {
    hero,
    radar_scores,
    radar_editorial,
    log_time_profile,
    genre_bubbles,
    country_map,
    recommendations,
    recommendations_status,
    recommendations_copy,
    cards_section,
    highlights_copy,
    cards,
    highlights,
  } = profile;
  const theme = useVisualTheme();
  const detectedFilmsCount =
    profile.profile_quality?.detected_films_count ?? hero.detected_films_count ?? 50;
  const targetFilmsCount = profile.profile_quality?.target_films_count ?? hero.target_films_count ?? 50;
  const sampleWarning = profile.profile_quality?.warning;
  const averageRating = profile.average_rating_summary?.value;
  const averageRatingScale = profile.average_rating_summary?.scale;
  const letterboxdProfileUrl = `https://letterboxd.com/${hero.username}/`;
  const ratingCard = cards.find((card) => card.id === "rating_personality") ?? null;
  const runtimeCard = cards.find((card) => card.id === "runtime_profile") ?? null;
  const averageRuntimeMinutes = radar_scores?.endurance?.raw_value;

  return (
    <main className="pageShell">
      <div className="pageThemeLabel">{theme.label}</div>
      <header className="siteHeader" aria-label="MyFiftyTaste">
        <div className="siteBranding">
          <Image
            src="/branding/logoV1-transparent.png"
            alt="MyFiftyTaste"
            width={1013}
            height={708}
            priority
            className="siteLogo"
          />
        </div>
      </header>

      <section className="headerBand" aria-label="Profil et astuce de découverte">
        <ProfileBadgesHeader username={hero.username} letterboxdUrl={letterboxdProfileUrl} badges={badges} />
        <DiscoveryTipCard />
      </section>

      <section className="heroTop heroTopWithTheme">
        <AverageRatingCard
          average={averageRating}
          scale={averageRatingScale}
          detectedFilmsCount={detectedFilmsCount}
        />
        <div className="heroPanelWrap">
          <p className="heroCoverageLine" tabIndex={0}>
            {detectedFilmsCount}/{targetFilmsCount} films analysés, {formatPercent(hero.metadata_coverage)}{" "}
            couverts par l&apos;algorithme &quot;Fifty&quot;
            <span className="heroCoverageTooltip" role="tooltip">
              Fiabilité&nbsp;: {ratingCard?.confidence_label ?? "—"}
            </span>
          </p>
          <aside className="heroPanel" aria-label="Profile coverage">
            <SeverityGauge card={ratingCard} />
          </aside>
        </div>
      </section>

      {sampleWarning ? (
        <section className="sampleWarning" aria-label="Profile sample warning">
          <p>{sampleWarning}</p>
        </section>
      ) : null}

      <RadarChart radarScores={radar_scores} radarEditorial={radar_editorial} />

      <GenreBubbles genreBubbles={genre_bubbles} detectedFilmsCount={detectedFilmsCount} />

      <WorldMap countryMap={country_map} />

      <Recommendations
        recommendations={recommendations}
        detectedFilmsCount={detectedFilmsCount}
        unavailableReason={recommendations_status?.unavailable_reason}
        copy={recommendations_copy}
      />

      <section className="highlightsSection" aria-label="Highlights">
        <div className="sectionHeading">
          <p className="eyebrow">{highlights_copy?.eyebrow ?? "HIGHLIGHTS"}</p>
          <h2>{highlights_copy?.title ?? "Toi, en 6 films clés et 1 réal"}</h2>
        </div>
        <HighlightsCarousel highlights={highlights} copy={highlights_copy} />
      </section>

      <section className="cardsSection" aria-label={cards_section?.title ?? "Summary"}>
        <div className="sectionHeading">
          <p className="eyebrow">{cards_section?.eyebrow ?? "SUMMARY"}</p>
          <h2>{cards_section?.title ?? "At a glance…"}</h2>
        </div>
        <div className="cardsGrid">
          <LogTimeMini logTimeProfile={log_time_profile} />
          <RuntimeFilmstrip card={runtimeCard} averageMinutes={averageRuntimeMinutes} />
        </div>
      </section>

      <HallOfFameCTA username={hero.username} />

      <footer className="siteFooter" aria-label="Informations sur MyFiftyTaste">
        <p>
          MyFiftyTaste · Profil généré à partir des 50 derniers films loggés par
          l&apos;utilisateur sur Letterboxd
        </p>
        <p>
          Made by{" "}
          <a href="https://letterboxd.com/tanguytare/" target="_blank" rel="noreferrer">
            Tanguytare
          </a>{" "}
          · Projet indépendant, non affilié à Letterboxd
        </p>
      </footer>
    </main>
  );
}
