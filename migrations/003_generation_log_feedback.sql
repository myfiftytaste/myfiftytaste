-- 003_generation_log_feedback.sql
--
-- Deux chantiers de données liés : un journal append-only de chaque
-- génération réussie, et une refonte du formulaire de feedback en un champ
-- par sujet plutôt qu'un pavé unique. Les deux visent le même usage :
-- SELECT * depuis le SQL Editor de Neon, export CSV direct dans Excel.

-- ---------------------------------------------------------------------------
-- generation_log — une ligne par génération réussie, écrite par worker.py
-- (finalize_success, best-effort). Jamais modifiée ni supprimée ensuite :
-- c'est un historique, pas un cache. Une colonne par métrique plutôt que du
-- JSON, pour rester directement exploitable en colonnes Excel sans parsing.
-- ---------------------------------------------------------------------------

CREATE TABLE generation_log (
    id                                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username                          text        NOT NULL,
    display_username                  text,
    generated_at                      timestamptz NOT NULL DEFAULT now(),

    detected_films_count              smallint,
    profile_quality_status            text,
    primary_archetype                 text,

    average_rating                    numeric,
    rating_gap_vs_letterboxd          numeric,

    -- Radar : valeur brute (exploitable) ET score 1-5 (ce qui est affiché à
    -- l'écran) pour chaque axe — demandé explicitement, les deux plutôt que
    -- l'un ou l'autre.
    mainstreamness_pct                numeric,
    mainstreamness_score              smallint,
    average_release_year              numeric,
    oldness_score                     smallint,
    average_runtime_minutes           numeric,
    endurance_score                   smallint,
    review_count                      smallint,
    reviewness_score                  smallint,

    -- Période couverte par les films détectés (année de sortie, pas date de
    -- log) : situe le profil dans le temps.
    earliest_film_year                smallint,
    latest_film_year                  smallint,

    -- Vrai total (sum des durées individuelles), pas une approximation
    -- moyenne x nombre — scripts/build_profile_metrics.py calcule runtime_total
    -- à partir de la même liste de durées que runtime_average.
    total_runtime_minutes             numeric,

    niche_index                       numeric,

    dominant_genre                    text,
    -- Fraction 0-1 (part du genre dominant parmi les mentions de genre),
    -- pas un pourcentage 0-100 : cohérent avec genre_dna.dominant_genre_share
    -- côté pipeline. v_generation_export la reformate en pourcentage lisible.
    dominant_genre_share              numeric,
    -- Chaîne texte jointe par virgules ("Drama, Thriller, Comedy"), pas du
    -- JSON — demandé explicitement.
    top_genres                        text,

    dominant_country                  text,
    top_countries                     text,

    most_repeated_director            text,
    most_repeated_director_film_count smallint,

    CONSTRAINT generation_log_username_normalized CHECK (username = lower(username)),
    CONSTRAINT generation_log_profile_quality_valid CHECK (
        profile_quality_status IS NULL OR profile_quality_status IN (
            'normal', 'partial', 'very_limited', 'impossible'
        )
    ),
    CONSTRAINT generation_log_mainstreamness_score_range CHECK (mainstreamness_score IS NULL OR mainstreamness_score BETWEEN 1 AND 5),
    CONSTRAINT generation_log_oldness_score_range        CHECK (oldness_score IS NULL OR oldness_score BETWEEN 1 AND 5),
    CONSTRAINT generation_log_endurance_score_range      CHECK (endurance_score IS NULL OR endurance_score BETWEEN 1 AND 5),
    CONSTRAINT generation_log_reviewness_score_range     CHECK (reviewness_score IS NULL OR reviewness_score BETWEEN 1 AND 5)
);

-- Historique d'un pseudo, et requêtes "générations récentes" — dans cet
-- ordre puisque generation_log grossit indéfiniment (jamais purgé).
CREATE INDEX generation_log_username_idx ON generation_log (username);
CREATE INDEX generation_log_generated_at_idx ON generation_log (generated_at DESC);


-- ---------------------------------------------------------------------------
-- feedback — refonte : un champ par sujet plutôt qu'un pavé unique (tags[] +
-- message), pour rester exploitable en colonnes. Table encore vide (aucune
-- route n'écrivait dedans avant ce chantier) : ALTER direct, rien à migrer.
-- ---------------------------------------------------------------------------

ALTER TABLE feedback DROP CONSTRAINT feedback_message_not_blank;
ALTER TABLE feedback DROP COLUMN tags;
ALTER TABLE feedback RENAME COLUMN message TO general_comment;
ALTER TABLE feedback ALTER COLUMN general_comment DROP NOT NULL;

ALTER TABLE feedback
    ADD COLUMN design_detail     text,
    ADD COLUMN clarte_detail     text,
    ADD COLUMN stats_detail      text,
    ADD COLUMN recos_detail      text,
    ADD COLUMN hof_detail        text,
    ADD COLUMN mobile_detail     text,
    ADD COLUMN bug_detail        text,
    ADD COLUMN idee_detail       text,
    ADD COLUMN autre_detail      text,
    -- "Ton profil te ressemble ?" — trois options fermées, jamais de texte libre ici.
    ADD COLUMN profile_resonates text,
    ADD COLUMN one_change        text,
    -- Contexte capté silencieusement (jamais demandé à la personne) :
    -- device pour distinguer les retours "sur mobile" des vrais bugs mobiles,
    -- source_page (document.referrer côté client) pour savoir d'où vient le
    -- retour une fois que le lien /feedback apparaîtra sur plusieurs pages.
    ADD COLUMN device             text,
    ADD COLUMN source_page        text;

ALTER TABLE feedback ADD CONSTRAINT feedback_resonates_valid CHECK (
    profile_resonates IS NULL OR profile_resonates IN ('oui', 'a_moitie', 'pas_du_tout')
);
ALTER TABLE feedback ADD CONSTRAINT feedback_device_valid CHECK (
    device IS NULL OR device IN ('mobile', 'desktop')
);
-- Équivalent de l'ancien feedback_message_not_blank : au moins un champ de
-- contenu rempli, pas un envoi totalement vide.
ALTER TABLE feedback ADD CONSTRAINT feedback_has_content CHECK (
    general_comment IS NOT NULL OR one_change IS NOT NULL OR profile_resonates IS NOT NULL OR
    design_detail IS NOT NULL OR clarte_detail IS NOT NULL OR stats_detail IS NOT NULL OR
    recos_detail IS NOT NULL OR hof_detail IS NOT NULL OR mobile_detail IS NOT NULL OR
    bug_detail IS NOT NULL OR idee_detail IS NOT NULL OR autre_detail IS NOT NULL
);


-- ---------------------------------------------------------------------------
-- Vues d'export CSV — colonnes renommées en français, valeurs reformatées
-- pour être lisibles telles quelles (arrondis, pourcentages, libellés).
-- Lancées depuis le SQL Editor de Neon : SELECT * FROM v_..._export.
-- ---------------------------------------------------------------------------

CREATE VIEW v_generation_export AS
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
    -- Calculé à la volée, pas stocké : generation_log est append-only et ne
    -- doit jamais être ré-écrit après coup, or opted_in peut changer bien
    -- après la génération (choix fait plus tard sur le profil). Une jointure
    -- vivante reste juste, une valeur figée à l'écriture serait fausse dès
    -- que la personne change d'avis.
    ms.opted_in                             AS hall_of_fame_opted_in
FROM generation_log g
LEFT JOIN monthly_snapshot ms
    ON ms.username = g.username
   AND ms.month = to_char(g.generated_at, 'YYYY-MM')
ORDER BY g.generated_at DESC;

CREATE VIEW v_feedback_export AS
SELECT
    f.id,
    f.created_at                                                     AS date_envoi,
    f.username                                                       AS pseudo,
    CASE f.profile_resonates
        WHEN 'oui'         THEN 'Oui, bien vu'
        WHEN 'a_moitie'    THEN 'À moitié'
        WHEN 'pas_du_tout' THEN 'Pas du tout'
        ELSE NULL
    END                                                               AS profil_ressemblant,
    f.device                                                         AS appareil,
    f.source_page                                                    AS page_origine,
    f.design_detail                                                  AS sujet_design,
    f.clarte_detail                                                  AS sujet_clarte_resultats,
    f.stats_detail                                                   AS sujet_justesse_stats,
    f.recos_detail                                                   AS sujet_recommandations,
    f.hof_detail                                                     AS sujet_hall_of_fame,
    f.mobile_detail                                                  AS sujet_mobile,
    f.bug_detail                                                     AS sujet_bug,
    f.idee_detail                                                    AS sujet_idee,
    f.autre_detail                                                   AS sujet_autre,
    f.general_comment                                                AS commentaire_general,
    f.one_change                                                     AS une_chose_a_changer
FROM feedback f
ORDER BY f.created_at DESC;
