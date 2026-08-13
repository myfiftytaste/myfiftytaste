import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// En local, DATABASE_URL (et TMDB_API_KEY pour le pipeline Python) vivent
// dans le .env à la racine du monorepo — source unique, déjà celle que
// scripts/migrate.py et worker.py lisent. Next.js ne charge par défaut que
// web/.env*, pas la racine : on le fait nous-mêmes ici.
//
// En production, Vercel injecte ses propres variables d'environnement et ce
// fichier n'existe jamais sur la plateforme (il est gitignoré, jamais
// déployé) : dotenv ne trouve rien et ne fait rien, sans erreur. Aucun
// risque de divergence entre le comportement local et la prod.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// quiet: true supprime les "tips" promotionnels que dotenv imprime sinon à
// chaque chargement (aucun appel réseau, juste du bruit dans les logs de
// build) — cf. node_modules/dotenv/lib/main.js.
loadEnv({ path: path.join(__dirname, "..", ".env"), quiet: true });

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
