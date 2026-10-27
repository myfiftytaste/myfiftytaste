-- 008_profile_color.sql
--
-- Couleur de la bulle de chaque profil (27/10/2026) : les trois couleurs de Letterboxd, attribuées
-- dans un ordre strict, orange → bleu → vert → orange…, pour un tiers de profils chacune.
-- Pas de choix possible pour l'instant. Clin d'œil : tanguytare garde les trois couleurs (« tricolor »),
-- hors du cycle.
-- pos = ordre d'attribution dans le cycle (NULL hors cycle). Le profil suivant prend la couleur qui
-- suit celle du plus grand pos (web/lib/profileColor.ts), même si des profils ont été supprimés.
-- À lancer sur Neon AVANT de vérifier l'aperçu (l'aperçu lit la même base).

CREATE TABLE IF NOT EXISTS profile_color (
    username    text        PRIMARY KEY,
    color       text        NOT NULL,
    pos         integer     UNIQUE,
    assigned_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT profile_color_username_normalized CHECK (username = lower(username)),
    CONSTRAINT profile_color_valid CHECK (color IN ('orange', 'blue', 'green', 'tricolor'))
);

-- Profils existants, dans l'ordre de leur première apparition. Le cycle est calé pour que le
-- dernier existant soit vert : le prochain nouveau profil sera orange.
WITH firsts AS (
    SELECT username, min(seen_at) AS first_at
    FROM (
        SELECT username, generated_at AS seen_at FROM generation_log
        UNION ALL SELECT username, generated_at FROM profile_cache
        UNION ALL SELECT username, first_seen_at FROM monthly_snapshot
    ) AS seen
    WHERE username <> 'tanguytare'
    GROUP BY username
),
ordered AS (
    SELECT username,
           row_number() OVER (ORDER BY first_at, username) AS pos,
           count(*) OVER () AS total
    FROM firsts
)
INSERT INTO profile_color (username, color, pos)
SELECT username, (ARRAY['green', 'orange', 'blue'])[((pos - total) % 3 + 3) % 3 + 1], pos
FROM ordered
ON CONFLICT (username) DO NOTHING;

INSERT INTO profile_color (username, color, pos) VALUES ('tanguytare', 'tricolor', NULL)
ON CONFLICT (username) DO UPDATE SET color = 'tricolor', pos = NULL;
