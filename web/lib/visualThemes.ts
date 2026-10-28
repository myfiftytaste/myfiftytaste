import fondDuMoment from "./fond-du-moment.json";

export type VisualTheme = {
  id: "hanabi" | "grande-bellezza" | "akira" | "midsommar" | "lalaland";
  // Fond réservé au calendrier ci-dessous : jamais tiré au hasard.
  scheduledOnly?: boolean;
  label: string;
  background: string;
  backgroundPosition: string;
  backgroundOverlay: string;
  accent: string;
  accentSoft: string;
  accentMuted: string;
  surfaceTint: string;
  borderTint: string;
  glow: string;
};

export const visualThemes: VisualTheme[] = [
  {
    id: "hanabi",
    label: "Hana-bi, 1997",
    background: "/branding/bg-hanabi-v1.jpg",
    backgroundPosition: "center top",
    backgroundOverlay:
      "linear-gradient(180deg, rgba(5, 10, 18, 0.18) 0%, rgba(5, 10, 18, 0.72) 58%, rgba(5, 10, 18, 0.96) 100%)",
    accent: "#E2B24A",
    accentSoft: "#6F92C8",
    accentMuted: "#A88B45",
    surfaceTint: "rgba(9, 22, 39, 0.72)",
    borderTint: "rgba(226, 178, 74, 0.30)",
    glow: "rgba(111, 146, 200, 0.11)"
  },
  {
    id: "grande-bellezza",
    label: "La Grande Bellezza, 2013",
    background: "/branding/bg-grande-belleza-v1.jpg",
    backgroundPosition: "center top",
    backgroundOverlay:
      "linear-gradient(180deg, rgba(10, 8, 5, 0.16) 0%, rgba(10, 8, 5, 0.72) 58%, rgba(10, 8, 5, 0.96) 100%)",
    accent: "#D7A64A",
    accentSoft: "#8A6A3A",
    accentMuted: "#B89A62",
    surfaceTint: "rgba(24, 18, 12, 0.72)",
    borderTint: "rgba(215, 166, 74, 0.28)",
    glow: "rgba(215, 166, 74, 0.10)"
  },
  {
    id: "akira",
    label: "Akira, 1988",
    background: "/branding/bg-akira-v1.jpg",
    backgroundPosition: "center top",
    backgroundOverlay:
      "linear-gradient(180deg, rgba(8, 8, 10, 0.24) 0%, rgba(8, 8, 10, 0.76) 58%, rgba(8, 8, 10, 0.97) 100%)",
    accent: "#D94A45",
    accentSoft: "#E4A94A",
    accentMuted: "#9B3635",
    surfaceTint: "rgba(18, 12, 13, 0.74)",
    borderTint: "rgba(217, 74, 69, 0.24)",
    glow: "rgba(217, 74, 69, 0.08)"
  },
  {
    id: "midsommar",
    label: "Midsommar, 2019",
    background: "/branding/bg-midsommar-v1.jpg",
    backgroundPosition: "center top",
    // Image déjà sombre : voile plus léger pour garder la silhouette fleurie visible.
    backgroundOverlay:
      "linear-gradient(180deg, rgba(6, 14, 14, 0.08) 0%, rgba(6, 14, 14, 0.5) 62%, rgba(6, 14, 14, 0.9) 100%)",
    accent: "#DDB65C",
    accentSoft: "#7FA69A",
    accentMuted: "#A88E52",
    surfaceTint: "rgba(10, 24, 24, 0.74)",
    borderTint: "rgba(221, 182, 92, 0.30)",
    glow: "rgba(127, 166, 154, 0.11)",
    scheduledOnly: true
  },
  {
    id: "lalaland",
    label: "La La Land, 2016",
    background: "/branding/bg-lalaland-v1.jpg",
    backgroundPosition: "center top",
    backgroundOverlay:
      "linear-gradient(180deg, rgba(12, 10, 26, 0.08) 0%, rgba(12, 10, 26, 0.5) 62%, rgba(12, 10, 26, 0.9) 100%)",
    accent: "#F0C24F",
    accentSoft: "#9A8BD0",
    accentMuted: "#B39345",
    surfaceTint: "rgba(18, 15, 38, 0.74)",
    borderTint: "rgba(240, 194, 79, 0.30)",
    glow: "rgba(154, 139, 208, 0.12)",
    scheduledOnly: true
  }
];

// Fond imposé à tout le monde (décision du 28/10/2026) : celui de lib/fond-du-moment.json, changé à la
// main par le workflow GitHub « Changer le fond du site » (commit sur main, puis redéploiement Vercel).
export const themeSchedule = [{ from: "2026-10-28T00:00:00+01:00", themeId: fondDuMoment.themeId }];

export function scheduledTheme(now: number = Date.now()): VisualTheme | undefined {
  const step = themeSchedule.filter((item) => Date.parse(item.from) <= now).pop();
  return visualThemes.find((item) => item.id === step?.themeId);
}
