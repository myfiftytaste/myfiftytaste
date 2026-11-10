"use client";

import { useEffect } from "react";
import { forgetInstallPrompt, keepInstallPrompt } from "../lib/installApp";

// Garde l'invite d'installation de Chrome dès le chargement, quelle que soit la page (voir lib/installApp.ts).
export default function InstallPromptCatcher() {
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", keepInstallPrompt);
    window.addEventListener("appinstalled", forgetInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", keepInstallPrompt);
      window.removeEventListener("appinstalled", forgetInstallPrompt);
    };
  }, []);
  return null;
}
