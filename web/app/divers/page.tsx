import Link from "next/link";
import BrandLockup from "../../components/BrandLockup";
import UpdateNote from "../../components/UpdateNote";
import { AMBIANCES_OPEN } from "../../lib/ambiance";

// Onglet « Divers » de la barre de navigation (maquette du 26/10/2026).
// Les lignes « Bientôt » restent visibles mais inactives jusqu'à leur lot.
type Row = { title: string; sub: string; href?: string; soon?: boolean };

// Rangement acté le 27/10/2026 : ce qui te concerne, ce qui concerne Fifty, puis le légal.
const groups: { title: string; rows: (Row | "updateNote")[] }[] = [
  {
    title: "Moi",
    rows: [
      { title: "Mes badges", sub: "Tous tes badges, et ceux affichés sur ton profil", href: "/badges" },
      {
        title: "Préférences",
        sub: "Ambiance des couleurs et fond de film",
        ...(AMBIANCES_OPEN ? { href: "/preferences" } : { soon: true }),
      },
      { title: "Changer de pseudo", sub: "Voir le wrapped d’un·e autre cinéphile", href: "/" },
      { title: "Installer l’application", sub: "Ajoute Fifty à ton écran d’accueil", soon: true },
    ],
  },
  {
    title: "À propos de Fifty",
    rows: [
      "updateNote",
      { title: "Le manifeste", sub: "Comment Fifty calcule ton profil", soon: true },
      { title: "Donner mon avis", sub: "Une minute, pas plus.", href: "/feedback?from=/divers" },
    ],
  },
  {
    title: "Infos",
    rows: [
      { title: "Mentions légales", sub: "Qui édite Fifty, où il tourne, d’où viennent les données", href: "/mentions-legales" },
      { title: "Confidentialité et cookies", sub: "Ce qui est gardé, combien de temps, tes droits", href: "/confidentialite" },
    ],
  },
];

function RowContent({ row }: { row: Row }) {
  return (
    <>
      <span className="diversRowText">
        <span className="diversRowTitle">
          {row.title}
          {row.soon ? <span className="diversRowSoon">Bientôt</span> : null}
        </span>
        <span className="diversRowSub">{row.sub}</span>
      </span>
      {row.soon ? null : (
        <span className="diversRowChevron" aria-hidden="true">
          ›
        </span>
      )}
    </>
  );
}

export default function DiversPage() {
  return (
    <main className="pageShell diversShell">
      <header className="siteHeader">
        <BrandLockup />
      </header>
      <h1 className="diversTitle">Divers</h1>
      {groups.map((group) => (
        <section key={group.title} className="diversGroup" aria-label={group.title}>
          <h2>{group.title}</h2>
          <div className="diversList">
            {group.rows.map((row) =>
              row === "updateNote" ? (
                <UpdateNote key="updateNote" variant="row" />
              ) : row.href ? (
                <Link key={row.title} href={row.href} className="diversRow">
                  <RowContent row={row} />
                </Link>
              ) : (
                <div key={row.title} className="diversRow diversRowSoonRow" aria-disabled="true">
                  <RowContent row={row} />
                </div>
              ),
            )}
          </div>
        </section>
      ))}
      <p className="diversFooter">
        Fifty · Projet indépendant, non affilié à Letterboxd · Données films : TMDB · Trifouillé par{" "}
        <a href="https://letterboxd.com/tanguytare/" target="_blank" rel="noreferrer">
          Tanguytare
        </a>
      </p>
    </main>
  );
}
