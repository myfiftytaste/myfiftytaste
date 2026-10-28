"use client";

import { useEffect, useState, type RefObject } from "react";

/** Élément « verrouillé » d'un module (bulle, pays) : un clic le fige, un clic dessus, un clic hors du
 * module ou Échap le relâche. Sortir du cadre avec la souris ne le relâche pas, pour pouvoir aller
 * cliquer sur un film de l'infobulle (retour du 28/10/2026). */
export function usePinned(containerRef: RefObject<HTMLElement | null>) {
  const [pinned, setPinned] = useState<string | null>(null);

  useEffect(() => {
    if (pinned === null) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setPinned(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPinned(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pinned, containerRef]);

  return [pinned, setPinned] as const;
}

/** Lien Letterboxd d'un film, à partir de son slug. */
export function letterboxdFilmUrl(slug?: string | null) {
  return slug ? `https://letterboxd.com/film/${slug}/` : null;
}
