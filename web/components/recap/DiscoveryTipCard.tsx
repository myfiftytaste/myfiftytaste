"use client";

import { useEffect, useState } from "react";

// Answers direct V1 feedback: people didn't realize the modules on this
// page were interactive until told explicitly. Depuis la maquette du 26/10/2026 :
// bulle qui lévite, venue du bord de l'écran ; la croix la renvoie hors cadre,
// une languette « ? » la fait revenir. Le choix est retenu sur cet appareil.
const STORAGE_KEY = "fifty-tip-closed";

export default function DiscoveryTipCard() {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    try {
      setClosed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Stockage indisponible (navigation privée stricte) : la bulle reste ouverte.
    }
  }, []);

  function toggle(next: boolean) {
    setClosed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Sans stockage, le choix vaut pour la visite en cours seulement.
    }
  }

  return (
    <>
      <div className={`tipBubble${closed ? " tipBubbleClosed" : ""}`} role="note" aria-label="Astuce" aria-hidden={closed}>
        <div className="tipBubbleBody">
          <p className="tipBubbleTitle">Curieuses et curieux, oyez, oyez&nbsp;!</p>
          <p className="tipBubbleText">
            <span className="verbPointer">Clique et survole</span>
            <span className="verbTouch">Appuie sur</span> les éléments pour en apprendre plus&nbsp;! Les noms des films
            t&apos;emmènent sur leur page Letterboxd.
          </p>
          <button
            type="button"
            className="tipBubbleClose"
            aria-label="Fermer l’astuce"
            tabIndex={closed ? -1 : 0}
            onClick={() => toggle(true)}
          >
            ×
          </button>
        </div>
      </div>
      {closed ? (
        <button type="button" className="tipBubbleTab" aria-label="Rouvrir l’astuce" onClick={() => toggle(false)}>
          ?
        </button>
      ) : null}
    </>
  );
}
