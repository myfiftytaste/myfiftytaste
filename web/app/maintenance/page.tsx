import type { Metadata } from "next";

export const metadata: Metadata = { title: "Maintenance · Fifty", robots: { index: false } };

// Affichée à la place de chaque page quand MAINTENANCE_MODE=1 (cf. middleware.ts). L'heure de retour =
// heure du déploiement qui active la maintenance + 24 h, arrondie à la demi-heure suivante (BUILD_TIME,
// next.config.mjs).

// ---------- Trois engrenages engrenés (couleurs Letterboxd) ----------
const MODULE = 4; // même module pour les trois : sinon les dents ne s'emboîtent pas
const deg = (a: number) => (a * Math.PI) / 180;

function gearPath(teeth: number): string {
  const r = (MODULE * teeth) / 2;
  const tip = r + MODULE;
  const root = r - 1.25 * MODULE;
  const pitch = 360 / teeth;
  const at = (radius: number, angle: number) => `${(radius * Math.cos(deg(angle))).toFixed(2)} ${(radius * Math.sin(deg(angle))).toFixed(2)}`;
  const points = Array.from({ length: teeth }, (_, k) => {
    const c = k * pitch; // dent k centrée sur l'angle c
    return [at(root, c - pitch * 0.5), at(root, c - pitch * 0.3), at(tip, c - pitch * 0.17), at(tip, c + pitch * 0.17), at(root, c + pitch * 0.3)];
  }).flat();
  const hole = r * 0.32;
  return `M${points.join(" L")} Z M${hole} 0 A${hole} ${hole} 0 1 0 ${-hole} 0 A${hole} ${hole} 0 1 0 ${hole} 0 Z`;
}

type Gear = { teeth: number; x: number; y: number; angle: number; color: string; dir: 1 | -1 };

/** Place chaque engrenage contre le précédent, dans la direction `toward`, en calant ses dents dans les creux. */
function chain(): Gear[] {
  const specs = [
    { teeth: 18, color: "#FF8000", toward: 0 },
    { teeth: 11, color: "#00E054", toward: -25 },
    { teeth: 8, color: "#40BCF4", toward: 55 },
  ];
  const gears: Gear[] = [{ teeth: specs[0].teeth, x: 0, y: 0, angle: 0, color: specs[0].color, dir: 1 }];
  for (const spec of specs.slice(1)) {
    const prev = gears[gears.length - 1];
    const dist = (MODULE * (prev.teeth + spec.teeth)) / 2;
    const prevPitch = 360 / prev.teeth;
    const pitch = 360 / spec.teeth;
    // Où en est le précédent face au contact (0 = une dent), et l'opposé pour le nouveau.
    const phase = (((spec.toward - prev.angle) % prevPitch) + prevPitch) % prevPitch / prevPitch;
    gears.push({
      teeth: spec.teeth,
      x: prev.x + dist * Math.cos(deg(spec.toward)),
      y: prev.y + dist * Math.sin(deg(spec.toward)),
      angle: spec.toward + 180 - (0.5 - phase) * pitch,
      color: spec.color,
      dir: prev.dir === 1 ? -1 : 1,
    });
  }
  return gears;
}

const GEARS = chain();
const SECONDS_PER_TOOTH = 0.55; // vitesse des dents identique pour les trois : ils roulent ensemble

function returnTime(): string {
  const end = Number(process.env.BUILD_TIME ?? Date.now()) + 24 * 3600 * 1000;
  const rounded = new Date(Math.ceil(end / (30 * 60 * 1000)) * 30 * 60 * 1000);
  const [h, m] = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })
    .format(rounded)
    .split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

export default function MaintenancePage() {
  return (
    <main className="pageShell maintenance">
      {/* Pas d'onglets : ils mèneraient tous ici. */}
      <style>{".navBar{display:none}"}</style>

      <div className="maintenanceLogos" aria-label="L'ancien logo de Fifty devient le nouveau">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/branding/logo-v1.webp" alt="Ancien logo" className="maintenanceOld" />
        <svg className="maintenanceArrow" viewBox="0 0 80 24" aria-hidden="true">
          <path d="M4 12 H70" strokeDasharray="4 5" />
          <path d="M64 5 L73 12 L64 19" />
        </svg>
        <span className="maintenanceNew">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/fifty-50.svg" alt="" />
          <span>Fifty</span>
        </span>
      </div>

      <svg className="maintenanceGears" viewBox="-44 -54 142 98" aria-hidden="true">
        {GEARS.map((gear) => (
          <g key={gear.teeth} transform={`translate(${gear.x.toFixed(2)} ${gear.y.toFixed(2)})`}>
            <g
              className={gear.dir === 1 ? "gearCw" : "gearCcw"}
              style={{ ["--start" as string]: `${gear.angle.toFixed(2)}deg`, animationDuration: `${(gear.teeth * SECONDS_PER_TOOTH).toFixed(2)}s` }}
            >
              <path d={gearPath(gear.teeth)} fill={gear.color} fillRule="evenodd" />
            </g>
          </g>
        ))}
      </svg>

      <p className="maintenanceText">
        Fifty est en maintenance ! Reviens demain à {returnTime()} pour en découvrir le nouveau visage :)
      </p>
    </main>
  );
}
