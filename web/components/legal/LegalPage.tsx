import Link from "next/link";
import type { ReactNode } from "react";
import BrandLockup from "../BrandLockup";

// Gabarit commun aux pages Mentions légales et Confidentialité (lot 9).
export const LEGAL_UPDATED = "27 octobre 2026";
export const CONTACT_EMAIL = "contact@50films.fr";

export function Contact() {
  return <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
}

export function Author() {
  return (
    <a href="https://letterboxd.com/tanguytare/" target="_blank" rel="noreferrer">
      Tanguytare
    </a>
  );
}

export default function LegalPage({ title, lede, children }: { title: string; lede: ReactNode; children: ReactNode }) {
  return (
    <main className="pageShell legalShell">
      <header className="siteHeader">
        <BrandLockup />
      </header>
      <article className="legalArticle">
        <h1>{title}</h1>
        <p className="legalUpdated">Dernière mise à jour : {LEGAL_UPDATED}</p>
        <div className="legalLede">{lede}</div>
        {children}
        <nav className="legalNav" aria-label="Pages légales">
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/confidentialite">Confidentialité et cookies</Link>
          <Link href="/divers">Retour à Divers</Link>
        </nav>
      </article>
    </main>
  );
}
