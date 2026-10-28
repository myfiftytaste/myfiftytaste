import type { Metadata } from "next";
import BrandLockup from "../../components/BrandLockup";

export const metadata: Metadata = { title: "Maintenance · Fifty", robots: { index: false } };

// Affichée à la place de chaque page quand MAINTENANCE_MODE=1 (cf. middleware.ts).
export default function MaintenancePage() {
  return (
    <main className="pageShell">
      {/* Pas d'onglets : ils mèneraient tous ici. */}
      <style>{".navBar{display:none}"}</style>
      <header className="siteHeader">
        <BrandLockup />
      </header>
      <h1 className="diversTitle">Fifty fait peau neuve</h1>
      <p className="fgMuted">
        Le site est fermé quelques heures, le temps d&apos;installer la nouvelle version. Reviens un peu plus tard : ton
        profil t&apos;attendra.
      </p>
    </main>
  );
}
