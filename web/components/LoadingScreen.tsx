"use client";

import { useEffect, useRef, useState } from "react";

// Reproduction fidèle de loading-screen-mockup.html : trois points aux
// couleurs Letterboxd en orbite, convergence en un point doré unique puis
// irradiation, quand `finished` passe à true. Pas d'indicateur de
// progression (X/8) : choix délibéré du mockup, pas un oubli.

const CAPTIONS = [
  "On déroule la pellicule…",
  "Projection en cours",
  "On cherche ton Rosebud",
  "Développement des négatifs",
  "Le projectionniste s'installe",
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
          <div className={`loadingAtom${finished ? " loadingDone" : ""}`}>
            <div className="loadingOrbit loadingOrbitA">
              <div className="loadingSpin">
                <div className="loadingDot loadingDotOrange" />
              </div>
            </div>
            <div className="loadingOrbit loadingOrbitB">
              <div className="loadingSpin">
                <div className="loadingDot loadingDotGreen" />
              </div>
            </div>
            <div className="loadingOrbit loadingOrbitC">
              <div className="loadingSpin">
                <div className="loadingDot loadingDotBlue" />
              </div>
            </div>
            <div className="loadingCore" />
            <div className="loadingHalo" />
          </div>
          <p className={`loadingCaption${fading ? " loadingFading" : ""}`}>{CAPTIONS[captionIndex]}</p>
          <p className={`loadingPatience${showPatience ? " loadingShow" : ""}`}>
            Letterboxd prend son temps. On ne t’a pas oublié.
          </p>
        </div>
      </div>
    </div>
  );
}
