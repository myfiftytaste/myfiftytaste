"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useVisualTheme } from "../components/VisualThemeProvider";
import { ApiError, postProfile } from "../lib/apiClient";

function cleanUsername(value: string) {
  return value.trim().replace(/^@+/, "").replace(/\s+/g, "");
}

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
        err instanceof ApiError ? err.message : "Impossible de lancer la génération du profil. Réessaie dans un instant.",
      );
    }
  }

  return (
    <main className="homeShell">
      <div className="homeThemeLabel">{theme.label}</div>
      <section className="homePanel" aria-labelledby="home-title">
        <Image
          src="/branding/logoV1-transparent.png"
          alt="MyFiftyTaste"
          width={1013}
          height={708}
          priority
          className="homeLogo"
        />
        <div className="homeCopy">
          <h1 id="home-title">Bonjour, toi.</h1>
          <p>Qui es-tu d’ailleurs&nbsp;?</p>
        </div>
        <form className="usernameForm" onSubmit={handleSubmit}>
          <label htmlFor="letterboxd-username">Saisis ton pseudo Letterboxd</label>
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
          <small id="username-hint">{error ?? "Le @ est facultatif."}</small>
        </form>
      </section>
    </main>
  );
}
