import type { Metadata } from "next";
import VisualThemeProvider from "../components/VisualThemeProvider";
import "./globals.css";

const SITE_NAME = "Fifty";
const SITE_DESCRIPTION = "Un profil cinéma construit à partir de ton activité Letterboxd.";

export const metadata: Metadata = {
  // Nécessaire pour que l'URL de l'image Open Graph ci-dessous soit résolue
  // en absolu (WhatsApp/Discord ne suivent pas les chemins relatifs).
  // L'URL du site reste myfiftytaste.vercel.app pour l'instant (fifty.vercel.app
  // déjà pris) — sans lien avec le nom affiché.
  metadataBase: new URL("https://myfiftytaste.vercel.app"),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [{ url: "/branding/logoV1.png", width: 1536, height: 1024 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <VisualThemeProvider>{children}</VisualThemeProvider>
      </body>
    </html>
  );
}
