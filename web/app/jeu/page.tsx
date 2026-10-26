import BrandLockup from "../../components/BrandLockup";

// Onglet « Jeu » : réservé au jeu de l'affiche (lot 11, livraison B, spécification en cours).
export default function JeuPage() {
  return (
    <main className="pageShell diversShell">
      <header className="siteHeader">
        <BrandLockup />
      </header>
      <span className="diversRowSoon jeuSoon">Bientôt</span>
      <h1 className="diversTitle">Le jeu</h1>
      <p className="jeuLede">
        Chaque semaine, une affiche floutée à deviner. Elle se dévoile un peu plus à chaque essai raté. On y travaille.
      </p>
    </main>
  );
}
