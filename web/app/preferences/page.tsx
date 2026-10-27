import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AmbiancePicker from "../../components/AmbiancePicker";
import BrandLockup from "../../components/BrandLockup";
import { AMBIANCES_OPEN } from "../../lib/ambiance";

export const metadata: Metadata = { title: "Préférences · Fifty" };

export default function PreferencesPage() {
  if (!AMBIANCES_OPEN) redirect("/divers");
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
