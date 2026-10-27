"use client";

import { useEffect, useState } from "react";
import { AMBIANCES, applyAmbiance, DEFAULT_AMBIANCE, readAmbiance, type AmbianceId } from "../lib/ambiance";

// Choix de l'ambiance : appliqué tout de suite, sans recharger, et retenu sur cet appareil.
export default function AmbiancePicker() {
  const [current, setCurrent] = useState<AmbianceId>(DEFAULT_AMBIANCE);
  useEffect(() => setCurrent(readAmbiance()), []);

  return (
    <section className="diversGroup" aria-labelledby="ambiance-title">
      <h2 id="ambiance-title">Ambiance</h2>
      <div className="ambianceList" role="radiogroup" aria-labelledby="ambiance-title">
        {AMBIANCES.map((ambiance) => {
          const checked = ambiance.id === current;
          return (
            <button
              key={ambiance.id}
              type="button"
              role="radio"
              aria-checked={checked}
              className={`ambianceOption${checked ? " ambianceOptionOn" : ""}`}
              onClick={() => {
                applyAmbiance(ambiance.id);
                setCurrent(ambiance.id);
              }}
            >
              <span className="ambianceSwatch" aria-hidden="true">
                {ambiance.colors.map((color) => (
                  <span key={color} style={{ background: color }} />
                ))}
              </span>
              <span className="ambianceText">
                <span className="ambianceFilm">{ambiance.film}</span>
                <span className="ambianceCredit">{ambiance.credit}</span>
              </span>
              <span className="ambianceState">{checked ? "Choisie" : ""}</span>
            </button>
          );
        })}
      </div>
      <p className="ambianceNote">
        L&apos;ambiance change les couleurs du site, pas les fonds de films. Elle est retenue sur cet appareil.
      </p>
    </section>
  );
}
