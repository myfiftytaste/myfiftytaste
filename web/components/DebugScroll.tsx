"use client";

import { useEffect, useState } from "react";

// Diagnostic temporaire du bug de scroll (backlog V3, lot 1). Ne s'active
// qu'avec ?debug-scroll=1 dans l'adresse : invisible pour les visiteurs.
// shortcut: composant à supprimer une fois la cause du saut trouvée.

type Jump = { at: string; from: number; to: number; heightBefore: number; heightNow: number; context: string[] };

function describe(element: Element | null): string {
  if (!element || element === document.body) return "body";
  const section = element.closest("section");
  const label = element.tagName.toLowerCase() + (element.className && typeof element.className === "string" ? `.${element.className.split(" ")[0]}` : "");
  return section && section !== element ? `${label} dans section.${section.className.split(" ")[0]}` : label;
}

export default function DebugScroll() {
  const [active, setActive] = useState(false);
  const [jumps, setJumps] = useState<Jump[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("debug-scroll")) return;
    setActive(true);

    // Tout ce qui peut faire défiler la page sans la molette, avec l'heure.
    const recent: { t: number; what: string }[] = [];
    const note = (what: string) => {
      recent.push({ t: performance.now(), what });
      if (recent.length > 40) recent.shift();
    };
    const originals = {
      scrollTo: window.scrollTo.bind(window),
      scrollBy: window.scrollBy.bind(window),
      scrollIntoView: Element.prototype.scrollIntoView,
      focus: HTMLElement.prototype.focus,
    };
    window.scrollTo = ((...args: Parameters<typeof window.scrollTo>) => {
      note(`window.scrollTo(${JSON.stringify(args)})`);
      return originals.scrollTo(...args);
    }) as typeof window.scrollTo;
    window.scrollBy = ((...args: Parameters<typeof window.scrollBy>) => {
      note(`window.scrollBy(${JSON.stringify(args)})`);
      return originals.scrollBy(...args);
    }) as typeof window.scrollBy;
    Element.prototype.scrollIntoView = function (this: Element, ...args: Parameters<Element["scrollIntoView"]>) {
      note(`scrollIntoView sur ${describe(this)}`);
      return originals.scrollIntoView.apply(this, args);
    };
    HTMLElement.prototype.focus = function (this: HTMLElement, ...args: Parameters<HTMLElement["focus"]>) {
      note(`focus() sur ${describe(this)}`);
      return originals.focus.apply(this, args);
    };
    const onFocusIn = (event: FocusEvent) => note(`focus reçu par ${describe(event.target as Element)}`);
    const onResize = () => note(`fenêtre redimensionnée ${innerWidth}×${innerHeight}`);
    // Une ligne par geste, pas une par cran de molette.
    const noteGesture = (what: string) => {
      const last = recent[recent.length - 1];
      if (!last || last.what !== what || performance.now() - last.t > 300) note(what);
      else last.t = performance.now();
    };
    const onWheel = (event: WheelEvent) => noteGesture(event.deltaY < 0 ? "molette ↑" : "molette ↓");
    const onTouch = () => noteGesture("doigt");
    document.addEventListener("focusin", onFocusIn);
    window.addEventListener("resize", onResize);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });

    // Contenu qui se décale sans que la position de défilement change (invisible au test ci-dessous) :
    // l'API Layout Instability dit quel élément a bougé, et de combien.
    let shiftObserver: PerformanceObserver | null = null;
    try {
      shiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          value: number;
          sources?: { node?: Node; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[];
        }[]) {
          if (entry.value < 0.02) continue;
          const sources = (entry.sources ?? [])
            .map((source) => `${describe(source.node instanceof Element ? source.node : null)} ${Math.round(source.previousRect.y)}→${Math.round(source.currentRect.y)}`)
            .join(" ; ");
          note(`décalage ${entry.value.toFixed(2)} : ${sources || "source inconnue"}`);
          setShifts((current) => [`${new Date().toLocaleTimeString("fr-FR")} · ${entry.value.toFixed(2)} · ${sources}`, ...current].slice(0, 4));
        }
      });
      shiftObserver.observe({ type: "layout-shift", buffered: false });
    } catch {
      // Navigateur sans Layout Instability API (Safari, Firefox) : le reste du diagnostic fonctionne.
    }

    // Remontée progressive (défilement doux) : on compare au point le plus bas de la dernière seconde.
    const history: { t: number; y: number }[] = [];

    let lastY = window.scrollY;
    let lastHeight = document.documentElement.scrollHeight;
    let frame = 0;
    const tick = () => {
      const y = window.scrollY;
      const height = document.documentElement.scrollHeight;
      if (height !== lastHeight) note(`hauteur de page ${lastHeight} → ${height}`);
      // Une molette ou un doigt remonte de ~100 px par image ; 400 px d'un coup vers le haut, c'est le bug.
      const now0 = performance.now();
      history.push({ t: now0, y });
      while (history.length && now0 - history[0].t > 1000) history.shift();
      const lowest = Math.max(...history.map((point) => point.y));
      const userWentUp = recent.some((entry) => now0 - entry.t < 1000 && (entry.what === "molette ↑" || entry.what === "doigt"));
      if (y < lastY - 400 || (y < lowest - 400 && !userWentUp)) {
        history.length = 0;
        const now = performance.now();
        const context = recent.filter((entry) => now - entry.t < 1500).map((entry) => `${Math.round(now - entry.t)} ms avant : ${entry.what}`);
        context.push(`élément actif : ${describe(document.activeElement)}`);
        const jump = {
          at: new Date().toLocaleTimeString("fr-FR"),
          from: Math.round(lastY),
          to: Math.round(y),
          heightBefore: lastHeight,
          heightNow: height,
          context,
        };
        console.warn("[debug-scroll]", jump);
        setJumps((current) => [jump, ...current].slice(0, 3));
      }
      lastY = y;
      lastHeight = height;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.scrollTo = originals.scrollTo;
      window.scrollBy = originals.scrollBy;
      Element.prototype.scrollIntoView = originals.scrollIntoView;
      HTMLElement.prototype.focus = originals.focus;
      document.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouch);
      shiftObserver?.disconnect();
    };
  }, []);

  if (!active) return null;

  return (
    <div className="debugScroll" role="status">
      <strong>Diagnostic scroll actif</strong>
      {jumps.length === 0 ? <p>Aucun saut détecté pour l’instant. Fais défiler normalement.</p> : null}
      {shifts.length ? (
        <>
          <p>Contenu décalé (élément · avant → après) :</p>
          <ul>
            {shifts.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </>
      ) : null}
      {jumps.map((jump, index) => (
        <div key={index}>
          <p>
            Saut à {jump.at} : {jump.from} → {jump.to} px (hauteur {jump.heightBefore} → {jump.heightNow})
          </p>
          <ul>
            {jump.context.map((line, lineIndex) => (
              <li key={lineIndex}>{line}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
