"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useVisualTheme } from "../components/VisualThemeProvider";
import { ApiError, postProfile } from "../lib/apiClient";
import { USERNAME_PATTERN } from "../lib/username";
import UpdateNote from "../components/UpdateNote";
import BrandLockup from "../components/BrandLockup";

function cleanUsername(value: string) {
  return value.trim().replace(/^@+/, "").replace(/\s+/g, "");
}

const USERNAME_HINT = "Un pseudo Letterboxd contient entre 2 et 15 lettres, chiffres ou _, rien d'autre.";

export default function Home() {
  const router = useRouter();
  const theme = useVisualTheme();
  const [username, setUsername] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedUsername = cleanUsername(username);
    if (!cleanedUsername || pending) return;

    // Validation immédiate, sans appel réseau : mêmes règles que côté
    // serveur (lib/username.ts, partagé), mais un aller-retour économisé
    // pour un format qu'on sait déjà invalide plutôt que d'attendre la
    // réponse 400 de POST /api/profile.
    if (!USERNAME_PATTERN.test(cleanedUsername)) {
      setError(USERNAME_HINT);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await postProfile(cleanedUsername);
      if (result.cached) {
        // Cache frais : /profile/{username} le retrouvera immédiatement via
        // GET /api/profile/{username}, sans jamais passer par l'écran de
        // chargement.
        router.push(`/profile/${encodeURIComponent(cleanedUsername)}`);
      } else {
        // Le job vient d'être créé (ou existait déjà) : on le transmet par
        // l'URL pour que la page de profil reprenne le polling directement,
        // sans re-poster.
        router.push(`/profile/${encodeURIComponent(cleanedUsername)}?job=${encodeURIComponent(result.job_id)}`);
      }
    } catch (err) {
      setPending(false);
      // Le 429 (rate limit) renvoie un message explicite et rassurant côté
      // route (web/lib/db.ts withinRateLimit) : on l'affiche tel quel plutôt
      // que de l'écraser par un message générique.
      setError(
        err instanceof ApiError ? err.message : "On a du mal à lancer la génération de ton profil. Réessaie dans un instant.",
      );
    }
  }

  return (
    <main className="homeShell">
      <div className="homeThemeLabel">{theme.label}</div>
      <BrandLockup />
      <section className="homePanel" aria-labelledby="home-title">
        <div className="homeCopy">
          <h1 id="home-title">Bonjour :)</h1>
          <p>Quel est ton nom&nbsp;?</p>
        </div>
        <form className="usernameForm" onSubmit={handleSubmit}>
          <label htmlFor="letterboxd-username">Ton pseudo Letterboxd</label>
          <div className="usernameField">
            <span aria-hidden="true">@</span>
            <input
              id="letterboxd-username"
              name="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="tanguytare"
              aria-describedby="username-hint"
              disabled={pending}
            />
            <button type="submit" aria-label="Voir le profil" disabled={!cleanUsername(username) || pending}>
              {pending ? "…" : "Voir"}
            </button>
          </div>
          <small id="username-hint">{error ??
              "Ne fais pas comme Maximus Decimus Meridius, mets juste ton pseudo. Pas besoin du « @ » ni de majuscule !"}</small>
        </form>
      </section>
      <UpdateNote />
    </main>
  );
}
