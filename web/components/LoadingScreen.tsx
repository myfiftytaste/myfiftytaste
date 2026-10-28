"use client";

import { useEffect, useRef, useState } from "react";

// Pendule de Newton (lot 13, maquette « Chargement ») : trois billes aux
// couleurs Letterboxd, potence visible ; quand `finished` passe à true, elles
// se rejoignent, fusionnent en une bille dorée puis un éclair ouvre le profil. Pas d'indicateur de
// progression (X/8) : choix délibéré du mockup, pas un oubli.

const CAPTIONS = [
  "On déroule la pellicule…",
  "Projection en cours",
  "Développement des négatifs",
  "Le projectionniste sort de sa sieste",
  "On rembobine tes 50 derniers films",
  "Silence, ça tourne",
  "Réglage de la mise au point",
];

const CAPTION_INTERVAL_MS = 3400;
const CAPTION_FADE_MS = 450;
const PATIENCE_DELAY_MS = 45_000;
// Temps entre le passage à `finished` et la fin de la séquence (convergence
// + irradiation), identique au mockup : c'est ce délai que le parent doit
// laisser s'écouler avant d'afficher le profil à la place.
const MERGE_DURATION_MS = 1350;

export default function LoadingScreen({
  finished,
  onMergeComplete,
}: {
  finished: boolean;
  onMergeComplete: () => void;
}) {
  const [captionIndex, setCaptionIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [showPatience, setShowPatience] = useState(false);
  const onMergeCompleteRef = useRef(onMergeComplete);
  onMergeCompleteRef.current = onMergeComplete;

  // Rotation des légendes, en pause dès que la séquence de fin démarre.
  useEffect(() => {
    if (finished) return;
    const interval = window.setInterval(() => {
      setFading(true);
      window.setTimeout(() => {
        setCaptionIndex((current) => (current + 1) % CAPTIONS.length);
        setFading(false);
      }, CAPTION_FADE_MS);
    }, CAPTION_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [finished]);

  // Message de patience après 45 s (pas la valeur raccourcie du mockup de démo).
  useEffect(() => {
    if (finished) return;
    const timeout = window.setTimeout(() => setShowPatience(true), PATIENCE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [finished]);

  // Prévient le parent une fois la séquence de convergence/irradiation jouée,
  // pour qu'il puisse remplacer cet écran par le profil.
  useEffect(() => {
    if (!finished) return;
    const timeout = window.setTimeout(() => onMergeCompleteRef.current(), MERGE_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [finished]);

  return (
    <div className="loadingShell">
      <div className="loadingStage">
        <div className={`loadingLoader${finished ? " loadingDone" : ""}`}>
          <div
            className={`loadingPendulum${finished ? " loadingDone" : ""}`}
            role="img"
            aria-label="Pendule de Newton à trois billes, en mouvement"
          >
            <div className="loadingFrame loadingPostL" />
            <div className="loadingFrame loadingPostR" />
            <div className="loadingFrame loadingBar" />
            <div className="loadingFrame loadingBase" />
            <div className="loadingShadow loadingShadowL" />
            <div className="loadingShadow loadingShadowM" />
            <div className="loadingShadow loadingShadowR" />
            <div className="loadingArm loadingArmL">
              <div className="loadingString" />
              <div className="loadingBall loadingBallOrange" />
            </div>
            <div className="loadingArm loadingArmM">
              <div className="loadingString" />
              <div className="loadingBall loadingBallGreen" />
            </div>
            <div className="loadingArm loadingArmR">
              <div className="loadingString" />
              <div className="loadingBall loadingBallBlue" />
            </div>
            <div className="loadingHalo" />
            <div className="loadingGold" />
            <div className="loadingFlash" />
          </div>
          <p className={`loadingCaption${fading ? " loadingFading" : ""}`}>{CAPTIONS[captionIndex]}</p>
          <p className={`loadingPatience${showPatience ? " loadingShow" : ""}`}>
            Patience, jeune padawan. Letterboxd prend son temps, on ne t’a pas oublié.
          </p>
        </div>
      </div>
    </div>
  );
}
