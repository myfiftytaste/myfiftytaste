import type { Metadata } from "next";
import VisualThemeProvider from "../components/VisualThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyFiftyTaste",
  description: "A cinematic taste profile built from Letterboxd activity.",
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
