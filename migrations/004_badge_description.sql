-- 004_badge_description.sql
--
-- Description facultative pour un badge, affichée au survol (et au tap sur
-- mobile — voir BadgeRow.tsx). Motivée par le badge manuel « Âme charitable »
-- (« Était là dans les débuts »), mais utilisable pour n'importe quel badge,
-- manuel ou gagné. NULL par défaut : aucune description n'est inventée pour
-- les badges déjà attribués, ni générée automatiquement pour les futurs
-- badges gagnés (podiums/continents) — c'est un choix éditorial, pas un
-- champ obligatoire.

ALTER TABLE badge ADD COLUMN description text;
