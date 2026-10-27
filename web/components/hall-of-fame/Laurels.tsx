// Deux branches de laurier autour d'une bulle (saison close du Hall of Fame, maquette du 27/10/2026).
// Feuilles tangentes au cercle, du bas vers le haut, ouvertes en haut. Calculées une fois au chargement.
const SIZE = 100;
const C = SIZE / 2;
const R = SIZE * 0.43;

function point(angleDeg: number, radius = R) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: C + radius * Math.sin(a), y: C - radius * Math.cos(a) };
}

const branches = [-1, 1].map((side) => {
  const angles = Array.from({ length: 8 }, (_, k) => 180 - side * (18 + k * 18)); // gauche 198→324, droite 162→36
  const start = point(angles[0]);
  const end = point(angles[angles.length - 1]);
  const stem = `M${start.x.toFixed(1)} ${start.y.toFixed(1)} A${R} ${R} 0 0 ${side < 0 ? 1 : 0} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  const leaves = angles.flatMap((angle) =>
    [-1, 1].map((off) => ({ ...point(angle, R + off * SIZE * 0.055), tilt: angle + off * side * 28 })),
  );
  return { stem, leaves };
});

export default function Laurels() {
  return (
    <svg className="hofLaurels" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      {branches.map((branch, index) => (
        <g key={index}>
          <path d={branch.stem} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          {branch.leaves.map((leaf, leafIndex) => (
            <ellipse
              key={leafIndex}
              cx={leaf.x.toFixed(1)}
              cy={leaf.y.toFixed(1)}
              rx={SIZE * 0.065}
              ry={SIZE * 0.027}
              transform={`rotate(${leaf.tilt.toFixed(0)} ${leaf.x.toFixed(1)} ${leaf.y.toFixed(1)})`}
              fill="currentColor"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
