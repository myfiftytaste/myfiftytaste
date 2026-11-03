"use client";

import { useEffect, useState } from "react";
import UpdateNoteAugust from "./UpdateNoteAugust";
import { NoteRoughFilter } from "./UpdateNoteDoodles";
import UpdateNoteNovember from "./UpdateNoteNovember";

// Dernière note en premier ; les précédentes restent lisibles par onglet (03/11/2026).
const NOTES = [
  { id: "v3", label: "Novembre 2026", date: "Novembre 2026 · V3" },
  { id: "v2", label: "Août 2026", date: "Août 2026" },
] as const;
type Edition = (typeof NOTES)[number]["id"];

// Note de mise à jour — temporaire par nature (architecture-v1-dynamique.md
// checklist, "à retirer/remplacer sans toucher au reste de la page"). Un
// seul fichier : le supprimer et retirer son unique <UpdateNote /> de
// app/page.tsx fait disparaître toute la fonctionnalité, rien d'autre à
// changer. Fidèle à feedback-et-note-maj-mockup_1.html, blocs 1 et 2 — pas
// un mot de contenu changé, seul le mécanisme de révélation est adapté
// (superposition plein écran ici, l'accueil n'ayant pas de second écran à
// faire défiler comme la page de démonstration de la maquette).
//
// Papier de brouillon froissé, scotché et perforé (retours du 27/10/2026) : mêmes matière et
// police (Caveat, var(--font-hand)) pour le papier épinglé et la feuille dépliée.

// `row` : même note, ouverte depuis une ligne de la page Divers au lieu du papier épinglé de l'accueil.
export default function UpdateNote({ variant = "paper" }: { variant?: "paper" | "row" }) {
  const [open, setOpen] = useState(false);
  const [edition, setEdition] = useState<Edition>("v3");

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div>
      {variant === "row" ? (
        <button type="button" className="diversRow" onClick={() => setOpen(true)}>
          <span className="diversRowText">
            <span className="diversRowTitle">Note de mise à jour</span>
            <span className="diversRowSub">Ce qui a changé dans Fifty</span>
          </span>
          <span className="diversRowChevron" aria-hidden="true">›</span>
        </button>
      ) : (
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
          <span className="updateNotePaper" aria-hidden="true" />
          <b>Note de mise à jour</b>
          <small>Novembre · Lire</small>
        </div>
      )}

      {open ? (
        <div className="updateNoteOverlay" onClick={() => setOpen(false)}>
          <div className="updateNoteSheet" onClick={(event) => event.stopPropagation()}>
            <div className="updateNotePage">
            <button type="button" className="updateNoteClose" onClick={() => setOpen(false)} aria-label="Fermer">
              ×
            </button>

            <h3>Note de mise à jour</h3>
            <div className="updateNoteTabs" role="tablist" aria-label="Notes de mise à jour">
              {NOTES.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  role="tab"
                  aria-selected={edition === note.id}
                  className="updateNoteTab"
                  onClick={() => setEdition(note.id)}
                >
                  {note.label}
                </button>
              ))}
            </div>
            <p className="updateNoteDate">Fifty — {NOTES.find((note) => note.id === edition)?.date}</p>
            <NoteRoughFilter />
            {edition === "v3" ? <UpdateNoteNovember /> : <UpdateNoteAugust />}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
