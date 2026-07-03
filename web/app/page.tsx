"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useVisualTheme } from "../components/VisualThemeProvider";

function cleanUsername(value: string) {
  return value.trim().replace(/^@+/, "").replace(/\s+/g, "");
}

export default function Home() {
  const router = useRouter();
  const theme = useVisualTheme();
  const [username, setUsername] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedUsername = cleanUsername(username);

    if (cleanedUsername) {
      router.push(`/profile/${encodeURIComponent(cleanedUsername)}`);
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
            />
            <button type="submit" aria-label="Voir le profil" disabled={!cleanUsername(username)}>
              Voir
            </button>
          </div>
          <small id="username-hint">Le @ est facultatif.</small>
        </form>
      </section>
    </main>
  );
}
