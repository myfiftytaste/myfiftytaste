"use client";

import { useEffect, useState } from "react";
import { hasInstallPrompt, isIos, isStandalone, onInstallPromptChange, promptInstall } from "../lib/installApp";

// Ligne « Installer l'application » de Divers (10/11/2026).
// - Chrome / Android : la vraie fenêtre d'installation.
// - iPhone / iPad : Apple ne permet aucun bouton, on montre le geste, et on prévient que l'appli
//   a sa propre mémoire (cookies séparés de Safari) : il faut retaper son pseudo une fois dedans.
// - Ailleurs, ou déjà installé : une explication.
type Panel = null | "ios" | "installed" | "other" | "done";

export default function InstallAppRow() {
  const [panel, setPanel] = useState<Panel>(null);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    setCanPrompt(hasInstallPrompt());
    return onInstallPromptChange(() => setCanPrompt(hasInstallPrompt()));
  }, []);

  const onClick = async () => {
    if (panel) return setPanel(null);
    if (isStandalone()) return setPanel("installed");
    if (canPrompt) return setPanel((await promptInstall()) ? "done" : null);
    setPanel(isIos() ? "ios" : "other");
  };

  return (
    <div className="installRow">
      <button type="button" className="diversRow" aria-expanded={Boolean(panel)} onClick={onClick}>
        <span className="diversRowText">
          <span className="diversRowTitle">Installer l’application</span>
          <span className="diversRowSub">Ajoute Fifty à ton écran d’accueil</span>
        </span>
        <span className="diversRowChevron" aria-hidden="true">
          {panel ? "−" : "›"}
        </span>
      </button>

      {panel === "ios" ? (
        <div className="installPanel">
          <ol>
            <li>
              Ouvre 50films.fr dans <b>Safari</b> (ou Chrome), puis touche le bouton <b>Partager</b>{" "}
              <ShareIcon />.
            </li>
            <li>
              Fais défiler et choisis <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>.
            </li>
            <li>Ouvre Fifty depuis sa nouvelle icône.</li>
          </ol>
          <p className="installNote">
            <b>Au premier lancement, retape ton pseudo.</b> Sur iPhone, l’appli a sa propre mémoire, séparée de Safari :
            relancer ton wrapped une fois dedans te permet ensuite d’y choisir tes badges, de jouer à FiftyGuess et de
            gérer ta place au Hall of Fame.
          </p>
        </div>
      ) : null}

      {panel === "other" ? (
        <div className="installPanel">
          <p>Ton navigateur ne propose pas l’installation directe. Selon l’appareil :</p>
          <ul>
            <li>
              <b>Android</b> : dans Chrome, menu <b>⋮</b> puis <b>Ajouter à l’écran d’accueil</b>.
            </li>
            <li>
              <b>Ordinateur</b> : dans Chrome ou Edge, l’icône d’installation au bout de la barre d’adresse ; dans Safari
              sur Mac, <b>Fichier › Ajouter au Dock</b>.
            </li>
          </ul>
        </div>
      ) : null}

      {panel === "installed" ? (
        <div className="installPanel">
          <p>Fifty est déjà installé : tu es dans l’application.</p>
        </div>
      ) : null}

      {panel === "done" ? (
        <div className="installPanel">
          <p>C’est fait : Fifty est sur ton écran d’accueil.</p>
        </div>
      ) : null}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg className="installShareIcon" viewBox="0 0 24 24" aria-label="(carré avec une flèche vers le haut)" role="img">
      <path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
