-- 001_initial_schema.sql
--
-- Schéma initial de la V1 dynamique.
-- Références : architecture-v1-dynamique.md (sections 2, 3, 6)
--              hall-of-fame-brief-claude-code.md (sections 2, 5)
--
-- Conventions appliquées partout dans ce fichier :
--
--   * `username` est TOUJOURS la forme normalisée (minuscules + trim). Une
--     contrainte CHECK l'impose au niveau base, pour que l'oubli d'un
--     lower() côté applicatif échoue immédiatement plutôt que de créer
--     silencieusement un doublon `Lucasld` / `lucasld`
--     (architecture section 3).
--
--   * `display_username` conserve la casse d'origine Letterboxd, uniquement
--     pour l'affichage. Elle n'est jamais une clé et ne sert jamais à
--     rechercher : le risque de doublon décrit ci-dessus ne réapparaît donc
--     pas. Sans cette colonne, un podium du Hall of Fame afficherait
--     « lucasld » au lieu de « Lucasld ».
--
--   * timestamptz partout, jamais timestamp : le cron Railway tourne en UTC
--     et les snapshots mensuels dépendent d'une frontière de mois.
--
-- Pas de BEGIN/COMMIT ici : scripts/migrate.py ouvre la transaction et y
-- insère aussi la ligne de suivi dans schema_migrations. Un COMMIT interne
-- validerait la transaction du runner trop tôt et casserait cette atomicité.


-- ---------------------------------------------------------------------------
-- job — file d'attente du worker. Pas de Redis ni de Celery : cette table EST
-- la file (runbook, en-tête).
-- ---------------------------------------------------------------------------

CREATE TABLE job (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    username         text        NOT NULL,
    display_username text,
    status           text        NOT NULL DEFAULT 'queued',
    current_step     smallint,
    step_label       text,
    error_code       text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    started_at       timestamptz,
    finished_at      timestamptz,

    CONSTRAINT job_username_normalized CHECK (username = lower(username)),
    CONSTRAINT job_status_valid        CHECK (status IN ('queued', 'running', 'done', 'error')),
    -- 8 étapes, cf. PIPELINE_STEPS dans scripts/build_full_profile.py
    CONSTRAINT job_current_step_range  CHECK (current_step IS NULL OR current_step BETWEEN 1 AND 8),
    -- Liste fermée volontairement : chaque code a un écran dédié côté
    -- frontend (architecture section 6). Un code inconnu n'aurait rien à
    -- afficher, mieux vaut que l'écriture échoue à l'insertion.
    CONSTRAINT job_error_code_valid    CHECK (
        error_code IS NULL OR error_code IN (
            'user_not_found',
            'profile_private',
            'no_films',
            'rate_limited',
            'internal_error'
        )
    ),
    CONSTRAINT job_error_has_code      CHECK (status <> 'error' OR error_code IS NOT NULL)
);

-- Le worker interroge cette colonne en boucle (SELECT ... WHERE status =
-- 'queued' ... FOR UPDATE SKIP LOCKED).
CREATE INDEX job_status_idx ON job (status);

-- Déduplication (architecture section 3) : deux personnes consultant le même
-- profil en même temps ne doivent pas déclencher deux fois le pipeline.
-- Poser la règle en index unique partiel plutôt que de la laisser au seul
-- applicatif ferme la fenêtre de concurrence entre le SELECT et l'INSERT.
CREATE UNIQUE INDEX job_one_active_per_username_idx
    ON job (username)
    WHERE status IN ('queued', 'running');

-- Balayage des jobs zombies (runbook phase 6) : un `running` trop vieux
-- repasse en queued/error. S'appuie sur started_at et non created_at, sinon
-- un job resté longtemps en file serait considéré comme mort dès sa prise.
CREATE INDEX job_running_started_at_idx
    ON job (started_at)
    WHERE status = 'running';


-- ---------------------------------------------------------------------------
-- profile_cache — sortie du pipeline, source de vérité en production à la
-- place de data/output/{username}_*.json (architecture section 2).
-- ---------------------------------------------------------------------------

CREATE TABLE profile_cache (
    username         text        PRIMARY KEY,
    display_username text,
    display_profile  jsonb       NOT NULL,
    metrics          jsonb,
    recommendations  jsonb,
    generated_at     timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT profile_cache_username_normalized CHECK (username = lower(username))
);

-- Support du TTL 24 h (architecture section 4).
CREATE INDEX profile_cache_generated_at_idx ON profile_cache (generated_at);


-- ---------------------------------------------------------------------------
-- monthly_snapshot — gel mensuel du Hall of Fame (brief section 2).
-- ---------------------------------------------------------------------------

CREATE TABLE monthly_snapshot (
    month                 text        NOT NULL,
    username              text        NOT NULL,
    display_username      text,
    first_seen_at         timestamptz NOT NULL DEFAULT now(),
    -- Tri-état volontaire : NULL = n'a pas encore choisi, true = opt-in,
    -- false = opt-out. Distinguer « pas décidé » de « refusé » permet de
    -- reposer la question sans harceler qui a déjà dit non.
    opted_in              boolean,
    opted_in_at           timestamptz,
    metrics_snapshot      jsonb       NOT NULL,
    continent_consumption jsonb       NOT NULL DEFAULT '{}'::jsonb,
    -- Alimente la liste de films affichée au survol d'un poinçon de la carte.
    continent_films       jsonb       NOT NULL DEFAULT '{}'::jsonb,

    PRIMARY KEY (month, username),
    CONSTRAINT monthly_snapshot_username_normalized CHECK (username = lower(username)),
    CONSTRAINT monthly_snapshot_month_format        CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT monthly_snapshot_optin_at_coherent   CHECK (opted_in IS NOT NULL OR opted_in_at IS NULL)
);

-- Les classements ne lisent que les profils opt-in du mois demandé.
CREATE INDEX monthly_snapshot_month_opted_in_idx
    ON monthly_snapshot (month)
    WHERE opted_in;


-- ---------------------------------------------------------------------------
-- badge — badges mensuels (brief sections 2 et 5).
-- ---------------------------------------------------------------------------

CREATE TABLE badge (
    id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username   text        NOT NULL,
    -- Distinction purement interne : sert à trier et filtrer côté back-office,
    -- n'est jamais affichée ni expliquée à l'utilisateur (brief section 6).
    type       text        NOT NULL,
    label      text        NOT NULL,
    category   text        NOT NULL,
    -- Rang du podium (1..3), NULL pour un badge manuel. selectDisplayBadges()
    -- s'en sert pour classer les badges épinglés « les mieux classés d'abord ».
    rank       smallint,
    -- NULL pour un badge manuel, qui n'appartient à aucune saison.
    month      text,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT badge_username_normalized CHECK (username = lower(username)),
    CONSTRAINT badge_type_valid          CHECK (type IN ('earned', 'manual')),
    CONSTRAINT badge_rank_range          CHECK (rank IS NULL OR rank BETWEEN 1 AND 3),
    CONSTRAINT badge_month_format        CHECK (month IS NULL OR month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT badge_earned_has_month    CHECK (type <> 'earned' OR month IS NOT NULL)
);

CREATE INDEX badge_username_idx ON badge (username);

-- attribute_badges.py doit pouvoir être relancé sans créer de doublon
-- (il peut se déclencher au cron ET à la première visite après changement de
-- mois). Le script fait déjà cette vérification en mémoire ; l'index la rend
-- vraie même si deux exécutions se chevauchent.
-- Les badges manuels ont month NULL et sont donc hors de cet index.
CREATE UNIQUE INDEX badge_earned_unique_idx
    ON badge (username, month, category)
    WHERE type = 'earned';


-- ---------------------------------------------------------------------------
-- feedback — formulaire court : tags + texte libre + pseudo optionnel
-- (architecture section 8).
-- ---------------------------------------------------------------------------

CREATE TABLE feedback (
    id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tags       text[]      NOT NULL DEFAULT '{}',
    message    text        NOT NULL,
    username   text,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT feedback_username_normalized CHECK (username IS NULL OR username = lower(username)),
    CONSTRAINT feedback_message_not_blank   CHECK (btrim(message) <> '')
);

-- Lecture principale : les retours les plus récents d'abord.
CREATE INDEX feedback_created_at_idx ON feedback (created_at DESC);
