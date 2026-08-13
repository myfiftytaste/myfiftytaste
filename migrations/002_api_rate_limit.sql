-- 002_api_rate_limit.sql
--
-- Rate limiting par IP sur POST /api/profile (architecture-v1-dynamique.md
-- section 4, runbook phase 6) : sans ça, une seule IP peut saturer la file
-- et bloquer la génération pour tout le monde.
--
-- Fenêtre fixe plutôt que sliding window : suffisant pour l'objectif
-- (empêcher une saturation, pas un contrôle fin du débit) et une seule ligne
-- par IP à maintenir, pas d'historique à purger.
--
-- Table plutôt que mémoire process : les fonctions serverless Vercel
-- n'ont pas d'état partagé entre invocations, ni de garantie de rester sur
-- la même instance d'un appel à l'autre.

CREATE TABLE api_rate_limit (
    ip_address     text        PRIMARY KEY,
    window_start   timestamptz NOT NULL DEFAULT now(),
    request_count  smallint    NOT NULL DEFAULT 0,

    CONSTRAINT api_rate_limit_count_non_negative CHECK (request_count >= 0)
);
