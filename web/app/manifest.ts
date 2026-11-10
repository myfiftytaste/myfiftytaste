import type { MetadataRoute } from "next";

// Application installable (lot 10, 10/11/2026) : ce fichier fait proposer « Installer
// l'application » par Chrome et Android. L'iPhone lit plutôt les balises appleWebApp du layout.
// Pas de service worker : Chrome n'en exige plus, et un cache servirait de vieux profils.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Fiftyfilms",
    short_name: "Fifty",
    description: "Ton profil cinéma, à partir de tes 50 derniers films Letterboxd.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f1a2b",
    theme_color: "#0f1a2b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
