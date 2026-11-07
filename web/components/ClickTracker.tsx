"use client";

import { useEffect } from "react";
import { linkKind, filmSlug, track, TRACK_MODULES, type TrackModule } from "../lib/track";

// Un seul écouteur pour tout le site (08/11/2026) : chaque clic sur un lien Letterboxd est compté.
// Le module vient du conteneur [data-track] le plus proche, la place de la reco de [data-track-slot].
export default function ClickTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button > 1) return; // clic gauche ou molette (nouvel onglet)
      const link = (event.target as Element | null)?.closest?.("a[href*='letterboxd.com']") as HTMLAnchorElement | null;
      if (!link) return;
      const declared = (link.closest("[data-track]") as HTMLElement | null)?.dataset.track ?? "autre";
      const area = (TRACK_MODULES as readonly string[]).includes(declared) ? (declared as TrackModule) : "autre";
      const slot = (link.closest("[data-track-slot]") as HTMLElement | null)?.dataset.trackSlot ?? "";
      track(area, linkKind(link.href), filmSlug(link.href), slot);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);
  return null;
}
