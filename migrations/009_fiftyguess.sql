-- 009_fiftyguess.sql
--
-- Fiftyguess, le jeu de la semaine (lot 11, décisions du 28/10/2026).
-- game_round : une affiche par semaine (lundi, heure de Paris) et un bonus par mois, préparés par
--   scripts/game_program.py. La réponse ne quitte jamais le serveur avant la fin de la partie.
-- game_play : une partie par pseudo et par affiche. Le chrono est tenu par le serveur
--   (started_at), le navigateur ne fait que l'afficher.
-- À lancer sur Neon avant de vérifier l'aperçu (l'aperçu lit la même base). Ajout seul.

CREATE TABLE IF NOT EXISTS game_round (
    id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind         text        NOT NULL,
    opens_on     date        NOT NULL,            -- lundi de la semaine, ou vendredi du bonus
    closes_on    date        NOT NULL,            -- dimanche inclus
    month        text        NOT NULL,            -- mois de jeu (AAAA-MM) : bonus et badges
    tmdb_id      integer     NOT NULL,
    title_fr     text        NOT NULL,
    title_orig   text        NOT NULL,
    aliases      text[]      NOT NULL DEFAULT '{}',
    year         integer,
    director     text,
    letterboxd_slug text,
    poster_url   text        NOT NULL,            -- affiche TMDB sans texte
    focus_x      real        NOT NULL,            -- point d'ouverture du cercle (0 à 1)
    focus_y      real        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT game_round_kind CHECK (kind IN ('week', 'bonus')),
    CONSTRAINT game_round_month_format CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT game_round_unique UNIQUE (kind, opens_on)
);

CREATE TABLE IF NOT EXISTS game_play (
    round_id     bigint      NOT NULL REFERENCES game_round (id) ON DELETE CASCADE,
    username     text        NOT NULL,
    mode         text        NOT NULL,
    started_at   timestamptz NOT NULL DEFAULT now(),
    finished_at  timestamptz,
    wrong        integer     NOT NULL DEFAULT 0,
    penalty      real        NOT NULL DEFAULT 0,  -- secondes ajoutées par les erreurs
    outcome      text,                            -- found, giveup, time
    score        real,                            -- secondes, compétitif seulement

    PRIMARY KEY (round_id, username),
    CONSTRAINT game_play_username_normalized CHECK (username = lower(username)),
    CONSTRAINT game_play_mode CHECK (mode IN ('compet', 'zen')),
    CONSTRAINT game_play_outcome CHECK (outcome IS NULL OR outcome IN ('found', 'giveup', 'time'))
);

CREATE INDEX IF NOT EXISTS game_play_username_idx ON game_play (username);

-- Titres proposés par la saisie assistée (français et originaux), pour que la bonne réponse se
-- noie parmi des centaines d'autres. Rempli par scripts/game_program.py.
CREATE TABLE IF NOT EXISTS game_title (
    title text PRIMARY KEY
);
