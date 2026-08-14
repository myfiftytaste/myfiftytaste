"use client";

import { useEffect, useState } from "react";
import { Caveat } from "next/font/google";

// Note de mise à jour — temporaire par nature (architecture-v1-dynamique.md
// checklist, "à retirer/remplacer sans toucher au reste de la page"). Un
// seul fichier : le supprimer et retirer son unique <UpdateNote /> de
// app/page.tsx fait disparaître toute la fonctionnalité, rien d'autre à
// changer. Fidèle à feedback-et-note-maj-mockup_1.html, blocs 1 et 2 — pas
// un mot de contenu changé, seul le mécanisme de révélation est adapté
// (superposition plein écran ici, l'accueil n'ayant pas de second écran à
// faire défiler comme la page de démonstration de la maquette).
//
// Police chargée ici, scopée au composant via une variable CSS sur le
// wrapper — aucun impact sur le reste du site tant qu'aucune autre classe
// ne la référence. Fraunces (--fd dans la maquette) n'est jamais utilisée
// dans les blocs 1/2 : .sheet h3 y est en Caveat (--fh), pas en Fraunces —
// inutile de la charger.
const caveat = Caveat({ subsets: ["latin"], weight: ["400", "600"], variable: "--note-font-hand" });

export default function UpdateNote() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className={caveat.variable}>
      <div
        className="updateNote"
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <b>Note de màj</b>
        ce qui a changé depuis la première version
        <small>Cliquer</small>
      </div>

      {open ? (
        <div className="updateNoteOverlay" onClick={() => setOpen(false)}>
          <div className="updateNoteSheet" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="updateNoteClose" onClick={() => setOpen(false)} aria-label="Fermer">
              ×
            </button>

            <h3>Note de mise à jour</h3>
            <p className="updateNoteDate">Fifty — Août 2026</p>

            <p>Hey</p>
            <p>Nous y voilà.</p>
            <p>
              La première version du site, alors baptisée «&nbsp;MyFiftyTaste&nbsp;» (on fait tous des erreurs) est
              désormais devenue «&nbsp;Fifty&nbsp;». Plusieurs d&apos;entre vous ont pu voir que le site ne savait
              afficher que 7 profils, pré-générés à la main. Une sorte d&apos;aperçu, une V0, un prétexte pour avoir
              vos retours&nbsp;: alors merci.
            </p>
            <p>Aujourd&apos;hui, Fifty analyse n&apos;importe quel compte Letterboxd public en instantané.</p>

            <h4>Le moteur : ce qui a changé</h4>
            <ul>
              <li>
                Le calcul d&apos;un profil tourne désormais sur un serveur dédié, en continu, au lieu d&apos;être
                lancé manuellement. Le script est autonome et enchaîne grossièrement 8 étapes : lecture du flux
                Letterboxd, enrichissement des métadonnées de films, calcul des métriques, recommandations, mise en
                forme, validation.
              </li>
              <li>
                Les profils sont stockés en base de données et conservés vingt-quatre heures (c&apos;est un cache
                temporaire). Ainsi consulter deux fois le même profil dans ce laps de temps ne relance pas le
                calcul : c&apos;est ce qui m&apos;évite de solliciter à outrance Letterboxd, qui limite le nombre de
                requêtes.
              </li>
              <li>
                J&apos;ai amélioré les 3 recommandations pour qu&apos;elles incluent la quasi-entièreté des films
                créés. Leur calcul est aussi plus poussé. Certaines favorisent des films peu connus, d&apos;autres
                des films récents, d&apos;autres des films issus de pays non représentés dans l&apos;analyse des 50
                derniers films.
              </li>
            </ul>

            <h4>La vitrine : ce qui a changé</h4>
            <ul>
              <li>Un écran d&apos;attente dynamique pendant le calcul.</li>
              <li>
                Un <em>Hall of Fame</em> mensuel : podiums, classement par continent, badges. Y figurer est un choix,
                proposé en bas de chaque profil. Les résultats sont figés à la première génération du mois, les
                badges sont décernés le dernier jour.
              </li>
              <li>
                Avec cette fonctionnalité, c&apos;est le début du volet <em>social</em> de Fifty. Les profils sont en
                effet accessibles puisque cliquables depuis le Hall of Fame, sans repasser par la page
                d&apos;accueil.
              </li>
              <li>
                Et puis, beaucouuuuuup de petits ajustements : graphismes animés, changements de rendus pour presque
                tous les modules, encadrés au survol et, bien sûr, toujours plus d&apos;informations !
              </li>
            </ul>

            <h4>Ce qui arrive</h4>
            <ul>
              <li>
                Je rédige encore le Manifeste du site, sorte d&apos;acte de transparence, important à mes yeux. Il se
                structure pour l&apos;heure en trois parties : genèse, éthique et méthodologie du projet.
              </li>
              <li>Les mentions légales et la charte de confidentialité arrivent également.</li>
              <li>
                L&apos;identité visuelle du site (arrière-plans, logo, trames, header et footer notamment) sera
                amenée à bouger les prochains jours.
              </li>
            </ul>

            <h4>Sur la méthode</h4>
            <p>
              Je le préciserai plus en profondeur dans le Manifeste, mais il est important de rappeler que mes
              idées ont été traduites en code par l&apos;IA. L&apos;architecture, l&apos;écriture du code, son
              déploiement, ses ajustements... J&apos;ai en particulier fait l&apos;usage de Codex, l&apos;IA de
              ChatGPT et surtout de Claude (Opus et Sonnet 5 notamment), l&apos;IA d&apos;Anthropic. Bien sûr, les
              choix de direction, d&apos;esthétique et de contenu restent miens (et plus important encore, les
              retours, vôtres).
            </p>
            <p>
              De plus, cette utilisation de l&apos;IA se situe exclusivement en amont. Quand vous générez un profil,
              aucune IA n&apos;est appelée (là aussi ce sera plus clairement expliqué dans le Manifeste). Et oui,
              même les recommandations ! Ces variables sont calculées à partir de vos goûts, qui définissent des
              archétypes assez précis. Ces habitudes personnelles sont dès lors confrontées aux métadonnées de films
              pour faire surgir ces recommandations.
            </p>

            <h4>Feedbacks</h4>
            <p>
              Enfin, vous pouvez d&apos;ores et déjà donner votre avis via un formulaire que j&apos;ai voulu le plus
              efficace et succinct possible. S&apos;il est très discret et caché tout en bas du site, il n&apos;en
              est pas moins vital à mes yeux. Je me ferai ainsi la meilleure idée de ce qui marche, manque,
              dysfonctionne, est à améliorer, bugge...
            </p>
            <p>Merci infiniment</p>

            <p className="updateNoteSign">— Tanguytare</p>
            <p className="updateNotePs">
              P.S. Âmes charitables qui m&apos;avez aidé, vous vous êtes intéressés, ou avez plus simplement craqué
              face à mon insistance pour avoir vos avis, vous trouverez épinglée à votre profil une façon de
              symboliser ma gratitude :)
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
