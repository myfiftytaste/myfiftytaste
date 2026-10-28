-- 010_fiftyguess_validation.sql
--
-- Fiftyguess, nouvelle méthode de programmation (28/10/2026) : vivier TMDB classé par les
-- consultations de Wikipédia en français, films proposés puis validés par Tanguy dans les coulisses.
-- (Le 28/10, le premier programme a été vidé à la main avec DELETE FROM game_round, avant cette
-- migration : personne n'avait joué.)

ALTER TABLE game_round ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'proposed';
ALTER TABLE game_round ADD COLUMN IF NOT EXISTS fame integer;   -- consultations fr.wikipedia sur 12 mois
ALTER TABLE game_round ADD COLUMN IF NOT EXISTS family text;    -- famille de studio (Marvel, Disney…)
ALTER TABLE game_round DROP CONSTRAINT IF EXISTS game_round_status;
ALTER TABLE game_round ADD CONSTRAINT game_round_status CHECK (status IN ('proposed', 'validated'));

-- Films remplacés dans les coulisses : jamais retirés.
CREATE TABLE IF NOT EXISTS game_excluded (
    tmdb_id     integer     PRIMARY KEY,
    title       text,
    excluded_at timestamptz NOT NULL DEFAULT now()
);

-- Notoriété en France, mesurée au plus une fois par an et par film.
CREATE TABLE IF NOT EXISTS game_fame (
    tmdb_id      integer     PRIMARY KEY,
    frwiki_title text,
    views_12m    integer,
    measured_at  timestamptz NOT NULL DEFAULT now()
);
