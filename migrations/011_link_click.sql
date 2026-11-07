-- 011_link_click.sql
--
-- Mesure des clics (08/11/2026) : combien de fois chaque lien Letterboxd est cliqué, par module,
-- et combien de cartes de reco sont retournées. Comptes agrégés par jour : ni pseudo, ni IP,
-- ni cookie (mesure d'audience anonyme, déclarée dans /confidentialite).
--   kind : 'vue' (recos affichées), 'retournee' (carte retournée), puis le type de lien cliqué :
--          'film', 'profil', 'personne', 'autre'.
--   slot : place de la reco (safe_pick, wild_card, deep_cut), '' ailleurs.
--   film : slug Letterboxd du film, '' pour les autres liens.

CREATE TABLE IF NOT EXISTS link_click (
  day    date    NOT NULL,
  module text    NOT NULL,
  kind   text    NOT NULL,
  slot   text    NOT NULL DEFAULT '',
  film   text    NOT NULL DEFAULT '',
  count  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, module, kind, slot, film)
);

-- Lecture type : taux de clic par place de reco depuis le 1er novembre.
--   SELECT slot,
--          sum(count) FILTER (WHERE kind = 'vue')       AS vues,
--          sum(count) FILTER (WHERE kind = 'retournee') AS retournees,
--          sum(count) FILTER (WHERE kind = 'film')      AS clics
--   FROM link_click WHERE module = 'recos' GROUP BY slot;
