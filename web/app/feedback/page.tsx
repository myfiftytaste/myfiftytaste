"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

// Fidèle à feedback-et-note-maj-mockup.html, bloc 3 uniquement (le formulaire
// — les blocs 1/2, note de mise à jour froissée/dépliée, sont un chantier
// séparé, pas encore construit).

type TagKey = "design" | "clarte" | "stats" | "recos" | "hof" | "mobile" | "bug" | "idee" | "autre";

const TAGS: { key: TagKey; label: string; placeholder: string }[] = [
  { key: "design", label: "Design", placeholder: "Ce qui t'a plu ou gêné visuellement…" },
  { key: "clarte", label: "Clarté des résultats", placeholder: "Ce que tu n'as pas compris, ou ce qui gagnerait à être expliqué…" },
  { key: "stats", label: "Justesse des stats", placeholder: "Un chiffre qui te semble faux ou étrange…" },
  { key: "recos", label: "Recommandations", placeholder: "Les films proposés te parlent, ou pas du tout ?" },
  { key: "hof", label: "Hall of Fame", placeholder: "Podiums, continents, badges…" },
  { key: "mobile", label: "Sur mobile", placeholder: "Ce qui s'affiche mal sur ton téléphone…" },
  { key: "bug", label: "Un bug", placeholder: "Ce que tu faisais, et ce qui s'est passé…" },
  { key: "idee", label: "Une idée", placeholder: "Ce que tu aimerais voir ici…" },
  { key: "autre", label: "Autre", placeholder: "Vas-y…" },
];

type Resonance = "oui" | "a_moitie" | "pas_du_tout";

const RESONANCE_OPTIONS: { key: Resonance; label: string }[] = [
  { key: "oui", label: "Oui, bien vu" },
  { key: "a_moitie", label: "À moitié" },
  { key: "pas_du_tout", label: "Pas du tout" },
];

// Même seuil que le reste du CSS (@media max-width: 760px).
const MOBILE_BREAKPOINT_PX = 760;

export default function FeedbackPage() {
  const [selectedTags, setSelectedTags] = useState<Set<TagKey>>(new Set());
  const [tagDetails, setTagDetails] = useState<Partial<Record<TagKey, string>>>({});
  const [resonance, setResonance] = useState<Resonance | null>(null);
  const [generalComment, setGeneralComment] = useState("");
  const [oneChange, setOneChange] = useState("");
  const [username, setUsername] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Contexte capté silencieusement, jamais demandé à la personne.
  const [context, setContext] = useState<{ device: "mobile" | "desktop"; sourcePage: string | null } | null>(null);
  useEffect(() => {
    // "from" (posé par les liens internes, ex. ProfileView) plutôt que
    // document.referrer, qui reste vide pour une navigation Next.js côté
    // client (Link ne fait pas un vrai rechargement) — document.referrer en
    // repli pour les arrivées par lien externe/rechargement complet.
    const from = new URLSearchParams(window.location.search).get("from");
    setContext({
      device: window.innerWidth <= MOBILE_BREAKPOINT_PX ? "mobile" : "desktop",
      sourcePage: from || document.referrer || null,
    });
  }, []);

  function toggleTag(key: TagKey) {
    setSelectedTags((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    const body: Record<string, string> = {};
    for (const tag of TAGS) {
      const detail = tagDetails[tag.key]?.trim();
      if (selectedTags.has(tag.key) && detail) {
        body[`${tag.key}_detail`] = detail;
      }
    }
    if (resonance) body.profile_resonates = resonance;
    if (generalComment.trim()) body.general_comment = generalComment.trim();
    if (oneChange.trim()) body.one_change = oneChange.trim();
    if (username.trim()) body.username = username.trim();
    if (context) {
      body.device = context.device;
      if (context.sourcePage) body.source_page = context.sourcePage;
    }

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Envoi impossible, réessaie dans un instant.");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible, réessaie dans un instant.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="feedback-shell pageShell">
      <header className="siteHeader" aria-label="Fifty">
        <div className="siteBranding">
          <Link href="/">
            <Image
              src="/branding/logoV1-transparent.png"
              alt="Fifty"
              width={1013}
              height={708}
              priority
              className="siteLogo"
            />
          </Link>
        </div>
      </header>

      <section className="feedbackMasthead">
        <p className="hofEyebrow">Feedback</p>
        <h2 className="feedbackTitle">Dis-moi ce que tu en penses</h2>
        <p className="hofLede hofLedeCentered">
          Une minute, pas plus. Le champ libre est le plus utile — le reste sert juste à trier.
        </p>
      </section>

      {sent ? (
        <section className="feedbackSentCard">
          <p className="feedbackTitle" style={{ marginBottom: 10 }}>
            Merci !
          </p>
          <p className="hofLede">C&apos;est envoyé et lu. Tu peux fermer cette page.</p>
        </section>
      ) : (
        <form className="feedbackForm" onSubmit={handleSubmit}>
          <div className="feedbackField">
            <div className="feedbackLabel">De quoi veux-tu parler&nbsp;?</div>
            <div className="feedbackHint">Choisis autant de sujets que tu veux — un champ s&apos;ouvre pour chacun.</div>
            <div className="feedbackTags">
              {TAGS.map((tag) => (
                <button
                  key={tag.key}
                  type="button"
                  className={`feedbackTag${selectedTags.has(tag.key) ? " feedbackTagOn" : ""}`}
                  onClick={() => toggleTag(tag.key)}
                  aria-pressed={selectedTags.has(tag.key)}
                >
                  {tag.label}
                </button>
              ))}
            </div>
            {selectedTags.size > 0 ? (
              <div className="feedbackDetails">
                {TAGS.filter((tag) => selectedTags.has(tag.key)).map((tag) => (
                  <div key={tag.key} className="feedbackDetail">
                    <div className="feedbackDetailLabel">{tag.label}</div>
                    <textarea
                      className="feedbackTextarea"
                      placeholder={tag.placeholder}
                      value={tagDetails[tag.key] ?? ""}
                      onChange={(event) => setTagDetails((current) => ({ ...current, [tag.key]: event.target.value }))}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="feedbackField">
            <div className="feedbackLabel">Ton profil te ressemble&nbsp;?</div>
            <div className="feedbackScale">
              {RESONANCE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`feedbackTag${resonance === option.key ? " feedbackTagOn" : ""}`}
                  onClick={() => setResonance(option.key)}
                  aria-pressed={resonance === option.key}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="feedbackField">
            <div className="feedbackLabel">Autre chose&nbsp;?</div>
            <div className="feedbackHint">Un ressenti général, une remarque qui n&apos;entre dans aucune case. Aucune forme attendue.</div>
            <textarea
              className="feedbackTextarea"
              placeholder="…"
              value={generalComment}
              onChange={(event) => setGeneralComment(event.target.value)}
            />
          </div>

          <div className="feedbackField">
            <div className="feedbackLabel">
              S&apos;il n&apos;y avait qu&apos;une chose à changer&nbsp;? <span className="feedbackLabelOptional">— facultatif</span>
            </div>
            <input
              type="text"
              className="feedbackInput"
              placeholder="une ligne suffit"
              value={oneChange}
              onChange={(event) => setOneChange(event.target.value)}
            />
          </div>

          <div className="feedbackField">
            <div className="feedbackLabel">
              Ton pseudo Letterboxd <span className="feedbackLabelOptional">— facultatif</span>
            </div>
            <div className="feedbackHint">Utile seulement si ton retour concerne ton propre profil.</div>
            <input
              type="text"
              className="feedbackInput"
              placeholder="pseudo"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <button type="submit" className="feedbackSubmit" disabled={pending}>
            {pending ? "…" : "Envoyer"}
          </button>
          {error ? (
            <p className="feedbackFoot" style={{ color: "var(--hof-gold-bright)" }}>
              {error}
            </p>
          ) : (
            <p className="feedbackFoot">Aucun compte, aucune adresse mail demandée.</p>
          )}
        </form>
      )}
    </main>
  );
}
