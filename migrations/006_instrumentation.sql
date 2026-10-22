-- 006_instrumentation.sql
--
-- Backlog V3, lot 3 : mesurer avant de corriger.
--
-- * generation_log : couvertures et listes de films / recos à chaque
--   génération, pour vérifier (1) si la couverture baisse avec les films
--   récents et (2) si les recos bougent alors que les films ne bougent pas.
--   Listes en texte joint par virgules (slugs Letterboxd), pas en JSON, comme
--   le reste de la table : lisibles directement dans l'export CSV.
-- * profile_cache.films : la liste des 50 films, jusqu'ici jamais stockée en
--   base (seul data/output/<pseudo>_wrapped.json la contenait, effacé à
--   chaque run). Base du futur onglet « Mes 50 films » (lot 14).
-- * api_rate_limit : la colonne ip_address contient désormais une empreinte
--   (hachage) de l'IP, plus l'IP en clair (web/lib/db.ts). Les lignes
--   existantes, en clair, sont supprimées : ce ne sont que des compteurs de
--   fenêtres de 10 minutes, rien à conserver.

ALTER TABLE generation_log
    ADD COLUMN social_coverage   numeric,
    ADD COLUMN metadata_coverage numeric,
    ADD COLUMN film_slugs        text,
    ADD COLUMN reco_slugs        text;

ALTER TABLE profile_cache ADD COLUMN films jsonb;

DELETE FROM api_rate_limit;

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
    g.mainstream_median_views               AS vues_film_du_milieu,
    round(g.social_coverage * 100)          AS couverture_sociale_pct,
    round(g.metadata_coverage * 100)        AS couverture_meta_pct,
    g.reco_slugs                            AS recos,
    g.film_slugs                            AS films
FROM generation_log g
LEFT JOIN monthly_snapshot ms
    ON ms.username = g.username
   AND ms.month = to_char(g.generated_at, 'YYYY-MM')
ORDER BY g.generated_at DESC;
