"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BadgeRow from "./hall-of-fame/BadgeRow";
import BrandLockup from "./BrandLockup";
import { MAX_PINNED, selectDisplayBadges, type Badge } from "../lib/badgeSelection";
import { readMyPseudo } from "../lib/myPseudo";

// Divers › Mes badges (maquette du 27/10/2026) : badges mythiques (sans saison) en haut, puis une
// ligne repliable par saison, la plus récente ouverte. Jusqu'à 3 badges choisis pour le profil.

const SEASONS_SHOWN = 4;

function monthName(month: string) {
  const label = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// « Top 1 Mainstream — octobre 2026 » : le mois est déjà le titre de la saison.
function shortLabel(badge: Badge) {
  return badge.month ? badge.label.split(" — ")[0] : badge.label;
}

function subLabel(badge: Badge) {
  if (badge.description) return badge.description;
  if (badge.category.startsWith("continent:")) return "Le plus de films de ce continent";
  return badge.rank ? `${badge.rank === 1 ? "1er" : `${badge.rank}e`} du podium` : null;
}

function Medal({ badge, small = false }: { badge: Badge; small?: boolean }) {
  const kind = badge.type === "manual" ? "mythic" : `rank${badge.rank ?? 1}`;
  return (
    <span className={`myBadgeMedal myBadgeMedal-${kind}${small ? " myBadgeMedalSmall" : ""}`} aria-hidden="true">
      {badge.type === "manual" ? "★" : badge.rank ?? "★"}
    </span>
  );
}

export default function MyBadges() {
  const [pseudo, setPseudo] = useState<string | null | undefined>(undefined);
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => setPseudo(readMyPseudo()), []);

  useEffect(() => {
    if (!pseudo) return;
    fetch(`/api/badges/${encodeURIComponent(pseudo)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data: { badges: Badge[]; canEdit: boolean }) => {
        setBadges(data.badges);
        setCanEdit(data.canEdit);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [pseudo]);

  const { mythic, seasons } = useMemo(() => {
    const all = badges ?? [];
    const byMonth = new Map<string, Badge[]>();
    for (const badge of all.filter((item) => item.month)) {
      byMonth.set(badge.month!, [...(byMonth.get(badge.month!) ?? []), badge]);
    }
    return {
      mythic: all.filter((badge) => !badge.month),
      seasons: Array.from(byMonth.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, items]) => ({ month, items: items.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)) })),
    };
  }, [badges]);

  const pinnedIds = (badges ?? []).filter((badge) => badge.pinned).map((badge) => badge.id);
  const display = selectDisplayBadges(badges ?? []);

  async function toggle(badge: Badge) {
    if (!canEdit || saving || !pseudo) return;
    const next = badge.pinned ? pinnedIds.filter((id) => id !== badge.id) : [...pinnedIds, badge.id];
    if (next.length > MAX_PINNED) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/badges/${encodeURIComponent(pseudo)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: next }),
      });
      if (response.ok) setBadges(((await response.json()) as { badges: Badge[] }).badges);
    } finally {
      setSaving(false);
    }
  }

  function row(badge: Badge) {
    const full = !badge.pinned && pinnedIds.length >= MAX_PINNED;
    return (
      <li key={badge.id} className="myBadgeRow">
        <Medal badge={badge} />
        <span className="myBadgeText">
          <span className="myBadgeTitle">{shortLabel(badge)}</span>
          {subLabel(badge) ? <span className="myBadgeSub">{subLabel(badge)}</span> : null}
        </span>
        {canEdit ? (
          <button
            type="button"
            className={`myBadgeToggle${badge.pinned ? " myBadgeToggleOn" : ""}`}
            aria-pressed={badge.pinned}
            disabled={saving || full}
            title={full ? `${MAX_PINNED} badges déjà affichés : retires-en un d'abord.` : undefined}
            onClick={() => toggle(badge)}
          >
            {badge.pinned ? "✓ Affiché" : "Afficher"}
          </button>
        ) : null}
      </li>
    );
  }

  const shownSeasons = showAll ? seasons : seasons.slice(0, SEASONS_SHOWN);

  return (
    <main className="pageShell diversShell">
      <header className="siteHeader">
        <BrandLockup />
      </header>
      <p className="myBadgesCrumb">
        <Link href="/divers">Divers ›</Link>
      </p>
      <h1 className="diversTitle">Mes badges</h1>

      {pseudo === null ? (
        <p className="listEmpty">
          Saisis d&apos;abord ton pseudo Letterboxd sur <Link href="/">l&apos;accueil</Link> : tes badges apparaîtront ici.
        </p>
      ) : status === "error" ? (
        <p className="listEmpty">Tes badges n&apos;ont pas pu être chargés. Réessaie dans un instant.</p>
      ) : status === "loading" || !badges ? (
        <p className="listEmpty">Chargement de tes badges…</p>
      ) : badges.length === 0 ? (
        <p className="listEmpty">
          Pas encore de badge. Inscris-toi au Hall of Fame du mois : les podiums et les continents en décernent à la fin de
          chaque mois.
        </p>
      ) : (
        <>
          <p className="myBadgesIntro">
            {badges.length} {badges.length > 1 ? "badges" : "badge"}. Choisis jusqu&apos;à {MAX_PINNED} badges à montrer sur
            ton profil.
          </p>

          <section className="myBadgesPreview" aria-label="Sur ton profil">
            <span className="myBadgesPreviewHead">
              Sur ton profil · {pinnedIds.length ? `${pinnedIds.length} sur ${MAX_PINNED}, choisis par toi` : "choix automatique"}
            </span>
            <span className="myBadgesPreviewPseudo">@{pseudo}</span>
            <BadgeRow manual={display.manual} earned={display.earned} overflowCount={display.overflowCount} />
          </section>

          {mythic.length ? (
            <section aria-labelledby="mythic-title">
              <h2 id="mythic-title" className="myBadgesSection myBadgesSectionMythic">
                ★ Badges mythiques
              </h2>
              <ul className="myBadgesList myBadgesListMythic">{mythic.map(row)}</ul>
            </section>
          ) : null}

          {seasons.length ? (
            <section aria-labelledby="seasons-title">
              <h2 id="seasons-title" className="myBadgesSection">
                Par saison
              </h2>
              {shownSeasons.map((season, index) => {
                const pinnedCount = season.items.filter((badge) => badge.pinned).length;
                return (
                  <details key={season.month} className="myBadgesSeason" open={index === 0}>
                    <summary>
                      <span className="myBadgesSeasonName">{monthName(season.month)}</span>
                      <span className="myBadgesSeasonMedals">
                        {season.items.slice(0, 5).map((badge) => (
                          <Medal key={badge.id} badge={badge} small />
                        ))}
                      </span>
                      <span className="myBadgesSeasonCount">
                        {season.items.length}
                        {pinnedCount ? ` · ${pinnedCount} affiché${pinnedCount > 1 ? "s" : ""}` : ""}
                      </span>
                    </summary>
                    <ul className="myBadgesList">{season.items.map(row)}</ul>
                  </details>
                );
              })}
              {seasons.length > SEASONS_SHOWN && !showAll ? (
                <button type="button" className="myBadgesMore" onClick={() => setShowAll(true)}>
                  Voir les saisons plus anciennes ▾
                </button>
              ) : null}
            </section>
          ) : null}

          <p className="myBadgesNote">
            {canEdit
              ? "Ton choix est lié à ce navigateur, celui qui a lancé ton wrapped. Sans choix, Fifty montre tes meilleurs classements."
              : "Pour choisir tes badges, lance ton wrapped depuis ce navigateur : c'est lui qui prouve que le profil est le tien."}
          </p>
        </>
      )}
    </main>
  );
}
