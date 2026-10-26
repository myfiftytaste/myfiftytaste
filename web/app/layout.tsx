import type { Metadata } from "next";
import localFont from "next/font/local";
import DebugScroll from "../components/DebugScroll";
import VisualThemeProvider from "../components/VisualThemeProvider";
import "./globals.css";

// Charte typo validée le 26/10/2026 : Besley (titres) + Schibsted Grotesk (texte, chiffres).
// Auto-hébergées (next/font/google plante sur Next 14.2.5, cf. UpdateNote.tsx) ; licences OFL dans app/fonts.
const titleFont = localFont({ src: "./fonts/besley.woff2", variable: "--font-title", weight: "400 900", display: "swap" });
const bodyFont = localFont({
  src: "./fonts/schibsted-grotesk.woff2",
  variable: "--font-body",
  weight: "400 900",
  display: "swap",
});

const SITE_NAME = "Fifty";
const SITE_DESCRIPTION = "Un profil cinéma construit à partir de ton activité Letterboxd.";

export const metadata: Metadata = {
  // Nécessaire pour que l'URL de l'image Open Graph ci-dessous soit résolue
  // en absolu (WhatsApp/Discord ne suivent pas les chemins relatifs).
  // Domaine officiel depuis le 22/10/2026 (myfiftytaste.vercel.app reste actif).
  metadataBase: new URL("https://50films.fr"),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [{ url: "/branding/archive/logoV1.png", width: 1536, height: 1024 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${titleFont.variable} ${bodyFont.variable}`}>
      <body>
        <VisualThemeProvider>{children}</VisualThemeProvider>
        <DebugScroll />
      </body>
    </html>
  );
}
