import type { Metadata } from "next";
import BrandLockup from "../../components/BrandLockup";
import Fiftyguess from "../../components/Fiftyguess";

export const metadata: Metadata = { title: "Fiftyguess · Fifty" };

// Onglet « Jeu » : Fiftyguess, le jeu de la semaine (lot 11).
export default function JeuPage() {
  return (
    <main className="pageShell fgPage">
      <header className="siteHeader">
        <BrandLockup />
      </header>
      <Fiftyguess />
    </main>
  );
}
