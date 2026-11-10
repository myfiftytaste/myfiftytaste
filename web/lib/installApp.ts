// Installation de Fifty comme application (10/11/2026), côté navigateur.
// Chrome envoie « beforeinstallprompt » une seule fois, souvent avant l'ouverture de Divers :
// InstallPromptCatcher (dans le layout) le garde ici pour que la ligne « Installer » s'en serve.

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function keepInstallPrompt(event: Event) {
  event.preventDefault(); // pas de bandeau automatique de Chrome : l'installation part de Divers
  deferred = event as InstallPromptEvent;
  listeners.forEach((listener) => listener());
}

export function forgetInstallPrompt() {
  deferred = null;
  listeners.forEach((listener) => listener());
}

export function hasInstallPrompt() {
  return deferred !== null;
}

export function onInstallPromptChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Ouvre la fenêtre d'installation de Chrome ; true si la personne a accepté. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null; // une invite ne sert qu'une fois
  await event.prompt();
  const { outcome } = await event.userChoice;
  listeners.forEach((listener) => listener());
  return outcome === "accepted";
}

/** Déjà ouvert depuis l'icône de l'écran d'accueil (Android, ordinateur ou iPhone). */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone et iPad, y compris l'iPad qui se présente comme un Mac. Apple n'offre aucune invite d'installation. */
export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}
