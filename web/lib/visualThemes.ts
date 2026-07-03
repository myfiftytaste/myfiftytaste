export type VisualTheme = {
  id: "hanabi" | "grande-bellezza" | "akira";
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
  }
];
