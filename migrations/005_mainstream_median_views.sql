-- 005_mainstream_median_views.sql
--
-- Recalibrage de l'axe mainstream (backlog V3, lot 4, actif au 1er novembre
-- 2026) : la mesure devient les vues Letterboxd du film « du milieu »
-- (scripts/mainstream_estimate.py). Colonne à part plutôt que de changer le
-- sens de mainstreamness_pct, qui garde l'ancien pourcentage : les exports
-- restent comparables d'avant en après.

ALTER TABLE generation_log ADD COLUMN mainstream_median_views integer;

-- Même vue qu'en 003, avec la nouvelle colonne ajoutée à la fin (CREATE OR
-- REPLACE VIEW n'accepte que des colonnes ajoutées en dernier).
CREATE OR REPLACE VIEW v_generation_export AS
SELECT
    g.id,
    g.username                              AS pseudo,
    g.display_username                      AS pseudo_affiche,
    g.generated_at                          AS date_generation,
    g.detected_films_count                  AS films_analyses,
    g.profile_quality_status                AS statut_profil,
    g.primary_archetype                     AS archetype,
    round(g.average_rating, 2)              AS note_moyenne,
    round(g.rating_gap_vs_letterboxd, 2)    AS ecart_vs_moyenne_letterboxd,
    round(g.mainstreamness_pct, 1)          AS mainstream_pct,
    g.mainstreamness_score                  AS mainstream_score_sur_5,
    round(g.average_release_year, 1)        AS annee_sortie_moyenne,
    g.oldness_score                         AS annee_score_sur_5,
    g.earliest_film_year                    AS annee_film_plus_ancien,
    g.latest_film_year                      AS annee_film_plus_recent,
    round(g.average_runtime_minutes, 1)     AS duree_moyenne_min,
    g.endurance_score                       AS duree_score_sur_5,
    round(g.total_runtime_minutes, 0)       AS duree_totale_min,
    g.review_count                          AS nb_reviews,
    g.reviewness_score                      AS reviews_score_sur_5,
    round(g.niche_index, 1)                 AS indice_niche,
    g.dominant_genre                        AS genre_dominant,
    round(g.dominant_genre_share * 100, 1)  AS genre_dominant_pct,
    g.top_genres                            AS genres_principaux,
    g.dominant_country                      AS pays_dominant,
    g.top_countries                         AS pays_principaux,
    g.most_repeated_director                AS realisateur_recurrent,
    g.most_repeated_director_film_count     AS realisateur_recurrent_nb_films,
    ms.opted_in                             AS hall_of_fame_opted_in,
    g.mainstream_median_views               AS vues_film_du_milieu
FROM generation_log g
LEFT JOIN monthly_snapshot ms
    ON ms.username = g.username
   AND ms.month = to_char(g.generated_at, 'YYYY-MM')
ORDER BY g.generated_at DESC;
