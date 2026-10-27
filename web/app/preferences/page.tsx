import type { Metadata } from "next";
import AmbiancePicker from "../../components/AmbiancePicker";
import BrandLockup from "../../components/BrandLockup";

export const metadata: Metadata = { title: "Préférences · Fifty" };

export default function PreferencesPage() {
  return (
    <main className="pageShell diversShell">
      <header className="siteHeader">
        <BrandLockup />
      </header>
      <h1 className="diversTitle">Préférences</h1>
      <AmbiancePicker />
    </main>
  );
}
