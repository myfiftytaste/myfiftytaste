-- 012_hof_weekly.sql
--
-- Gel hebdomadaire du Hall of Fame (23/11/2026). L'instantané du mois (monthly_snapshot) est
-- rafraîchi à la première visite de chaque semaine, à partir de décembre 2026
-- (WEEKLY_FREEZE_FROM_MONTH dans worker.py). Le classement du mois lit donc la dernière semaine
-- où la personne est venue ; sans visite, l'instantané précédent reste.
--   week_start   : lundi (heure de Paris) de la semaine de l'instantané en place.
--   refreshed_at : moment où il a été pris. first_seen_at reste la première visite du mois.
-- Colonnes vides pour les lignes existantes : rien n'est recalculé.

ALTER TABLE monthly_snapshot ADD COLUMN IF NOT EXISTS week_start   date;
ALTER TABLE monthly_snapshot ADD COLUMN IF NOT EXISTS refreshed_at timestamptz;
