"use client";

import { useEffect, useState } from "react";

type OptStatus = "loading" | "unavailable" | "undecided" | "in" | "out";

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  if (!year || !monthIndex) return month;
  const date = new Date(Date.UTC(year, monthIndex - 1, 1));
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export default function HallOfFameCTA({ username }: { username: string }) {
  const month = currentMonth();
  const [status, setStatus] = useState<OptStatus>("loading");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/hall-of-fame/opt-in?username=${encodeURIComponent(username)}&month=${encodeURIComponent(month)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data || !data.exists) {
          setStatus("unavailable");
        } else if (data.optedIn === true) {
          setStatus("in");
        } else if (data.optedIn === false) {
          setStatus("out");
        } else {
          setStatus("undecided");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [username, month]);

  async function choose(optedIn: boolean) {
    setPending(true);
    try {
      const response = await fetch("/api/hall-of-fame/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, month, optedIn }),
      });
      if (response.ok) {
        setStatus(optedIn ? "in" : "out");
      }
    } finally {
      setPending(false);
    }
  }

  if (status === "loading" || status === "unavailable") {
    return null;
  }

  return (
    <section className="hofCtaSection" aria-label="Hall of Fame">
      <div className="hofCtaCard">
        <p className="hofEyebrow">Saison en cours · {monthLabel(month)}</p>
        {status === "undecided" ? (
          <>
            <h2 className="hofCtaTitle">Ta place dans le Hall of Fame du mois&nbsp;?</h2>
            <p className="hofLede">
              On fige ton profil du mois et on le compare aux autres cinéphiles. Aucun compte, aucun engagement — tu
              peux revenir sur ton choix.
            </p>
            <div className="hofCtaActions">
              <button type="button" className="hofBtn hofBtnPrimary" onClick={() => choose(true)} disabled={pending}>
                Je veux ma place
              </button>
              <button type="button" className="hofBtn hofBtnGhost" onClick={() => choose(false)} disabled={pending}>
                Je passe mon tour
              </button>
            </div>
          </>
        ) : status === "in" ? (
          <>
            <h2 className="hofCtaTitle">Tu es dans le Hall of Fame du mois.</h2>
            <p className="hofLede">Ton profil de ce mois-ci est figé et comparé aux autres cinéphiles.</p>
            <div className="hofCtaActions">
              <a className="hofBtn hofBtnPrimary" href="/hall-of-fame">
                Voir le Hall of Fame
              </a>
              <button type="button" className="hofBtn hofBtnGhost" onClick={() => choose(false)} disabled={pending}>
                Je change d’avis
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="hofCtaTitle">Tu as passé ton tour ce mois-ci.</h2>
            <p className="hofLede">Ton profil n’apparaît pas dans le Hall of Fame du mois. Tu peux revenir dessus.</p>
            <div className="hofCtaActions">
              <button type="button" className="hofBtn hofBtnPrimary" onClick={() => choose(true)} disabled={pending}>
                Finalement, je veux ma place
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
