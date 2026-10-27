-- 007_badge_pinned.sql
--
-- « Mes badges » (27/10/2026) : chacun choisit jusqu'à 3 badges affichés sur son profil.
-- Sans aucun badge choisi, le profil garde la règle automatique (meilleurs classements).
-- Ajout seul, valeur par défaut : le code actuel de main ignore la colonne sans planter.
-- À lancer sur Neon AVANT de vérifier l'aperçu (l'aperçu lit la même base).

ALTER TABLE badge ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
