"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OptInStatus } from "../../lib/hallOfFame";

// Choix de participer au Hall of Fame, déplacé du bas du wrapped vers l'onglet Hall of Fame
// (maquette du 26/10/2026) : carte centrée tant que rien n'est décidé, puis une petite ligne
// en haut à droite pour changer d'avis. Après un choix, la page est recalculée côté serveur
// (pseudos dévoilés ou masqués).
export default function HallOfFameCTA({
  username,
  month,
  status,
}: {
  username: string | null;
  month: string;
  status: OptInStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function choose(optedIn: boolean) {
    if (!username) return;
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/hall-of-fame/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, month, optedIn }),
      });
      if (!response.ok) throw new Error(String(response.status));
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  if (status === "in" || status === "out") {
    return (
      <p className="hofChoiceLine">
        {status === "in" ? "Tu figures dans la saison · " : "Tu n’y figures pas ce mois-ci · "}
        <button type="button" onClick={() => choose(status !== "in")} disabled={pending}>
          {status === "in" ? "Me retirer" : "Je veux ma place"}
        </button>
        {error ? <span className="hofChoiceError"> Ça n’a pas marché, réessaie.</span> : null}
      </p>
    );
  }

  return (
    <section className="hofCtaSection" aria-label="Rejoindre le Hall of Fame">
      <div className="hofCtaCard">
        {status === "undecided" ? (
          <>
            <h2 className="hofCtaTitle">Ta place dans le Hall of Fame du mois&nbsp;?</h2>
            <p className="hofLede">
              On fige ton profil mensuel et on le compare aux autres cinéphiles. Pas besoin de compte, pas
              d&apos;engagement : tu peux revenir sur ton choix.
            </p>
            <div className="hofCtaActions">
              <button type="button" className="hofBtn hofBtnPrimary" onClick={() => choose(true)} disabled={pending}>
                Je veux ma place
              </button>
              <button type="button" className="hofBtn hofBtnGhost" onClick={() => choose(false)} disabled={pending}>
                Je passe mon tour
              </button>
            </div>
            {error ? <p className="hofChoiceError">Ça n’a pas marché, réessaie.</p> : null}
          </>
        ) : (
          <>
            <h2 className="hofCtaTitle">Ta place dans le Hall of Fame du mois&nbsp;?</h2>
            <p className="hofLede">Génère ton wrapped de ce mois-ci pour pouvoir rejoindre la saison.</p>
            <div className="hofCtaActions">
              <Link className="hofBtn hofBtnPrimary" href={username ? `/profile/${encodeURIComponent(username)}` : "/"}>
                Mon wrapped
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
