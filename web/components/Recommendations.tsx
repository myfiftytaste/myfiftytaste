/* eslint-disable @next/next/no-img-element */

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
  poster_status?: "verified" | "ambiguous" | "missing" | string | null;
};

type RecommendationsCopy = {
  eyebrow?: string;
  title?: string;
  subtitle_template?: string;
  unavailable_text?: string;
  slot_labels?: Record<string, string>;
  slot_descriptions?: Record<string, string>;
};

function metaList(values: string[] | undefined, limit = 3) {
  return (values ?? []).slice(0, limit).join(" · ");
}

function Poster({ recommendation }: { recommendation: Recommendation }) {
  if (recommendation.poster_status === "verified" && recommendation.poster_url) {
    return (
      <img
        className="recommendation-poster"
        src={recommendation.poster_url}
        alt=""
        loading="lazy"
      />
    );
  }

  return (
    <div className="recommendation-poster recommendation-poster-fallback" aria-hidden="true">
      <span>{recommendation.title?.slice(0, 1) || "?"}</span>
    </div>
  );
}

export default function Recommendations({
  recommendations,
  detectedFilmsCount = 50,
  unavailableReason,
  copy,
}: {
  recommendations?: Recommendation[];
  detectedFilmsCount?: number;
  unavailableReason?: string | null;
  copy?: RecommendationsCopy;
}) {
  const eyebrow = copy?.eyebrow ?? "RECOMMANDATIONS";
  const title = copy?.title ?? "Trois recos pour la suite, à voir ou revoir";
  const subtitle =
    copy?.subtitle_template?.replace("{detected_films_count}", String(detectedFilmsCount)) ??
    `Des recommandations calculées à partir de tes ${detectedFilmsCount} films détectés, sans IA.`;
  const unavailableText = copy?.unavailable_text ?? "Recommandations indisponibles pour ce profil.";
  const slotLabels = copy?.slot_labels ?? {};
  const slotDescriptions = copy?.slot_descriptions ?? {};

  if (!recommendations || recommendations.length === 0) {
    if (!unavailableReason) {
      return null;
    }
    return (
      <section className="recommendations-section" aria-label={title}>
        <div className="sectionHeading">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{unavailableText}</p>
        </div>
        <div className="recommendations-unavailable">
          <p>{unavailableReason}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="recommendations-section" aria-label={title}>
      <div className="sectionHeading">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="recommendations-grid">
        {recommendations.map((recommendation) => {
          const content = (
            <>
              <Poster recommendation={recommendation} />
              <div className="recommendation-body">
                <div className="recommendation-topline">
                  <span>{slotLabels[recommendation.slot] ?? recommendation.slot}</span>
                </div>
                <h3>
                  {recommendation.title}
                  {recommendation.year ? <em>{recommendation.year}</em> : null}
                </h3>
                <div className="recommendation-meta">
                  {recommendation.genres?.length ? <span>{metaList(recommendation.genres)}</span> : null}
                  {recommendation.countries?.length ? <span>{metaList(recommendation.countries, 2)}</span> : null}
                </div>
                <p>{slotDescriptions[recommendation.slot] ?? recommendation.reason_text}</p>
                <div className="recommendation-footer">
                  {recommendation.director ? <span>{recommendation.director}</span> : <span>{recommendation.slug}</span>}
                </div>
              </div>
            </>
          );

          if (recommendation.letterboxd_url) {
            return (
              <a
                className="recommendation-card"
                href={recommendation.letterboxd_url}
                key={recommendation.slot}
                rel="noreferrer"
                target="_blank"
              >
                {content}
              </a>
            );
          }

          return (
            <article className="recommendation-card" key={recommendation.slot}>
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
}
