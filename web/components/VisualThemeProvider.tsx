"use client";

import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { visualThemes, type VisualTheme } from "../lib/visualThemes";

const defaultThemeId = "hanabi";
const sessionThemeKey = "myfiftytaste-visual-theme";

const VisualThemeContext = createContext<VisualTheme>(
  visualThemes.find((item) => item.id === defaultThemeId) ?? visualThemes[0],
);

function getRandomTheme(): VisualTheme {
  const index = Math.floor(Math.random() * visualThemes.length);
  return visualThemes[index] ?? visualThemes[0];
}

export function useVisualTheme() {
  return useContext(VisualThemeContext);
}

export default function VisualThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<VisualTheme>(
    visualThemes.find((item) => item.id === defaultThemeId) ?? visualThemes[0],
  );
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    let selectedTheme = getRandomTheme();
    const requestedThemeId = new URLSearchParams(window.location.search).get("theme");
    const requestedTheme = visualThemes.find((item) => item.id === requestedThemeId);

    try {
      const storedThemeId = window.sessionStorage.getItem(sessionThemeKey);
      const storedTheme = visualThemes.find((item) => item.id === storedThemeId);
      selectedTheme = requestedTheme ?? storedTheme ?? selectedTheme;

      if (requestedTheme || !storedTheme) {
        window.sessionStorage.setItem(sessionThemeKey, selectedTheme.id);
      }
    } catch {
      selectedTheme = requestedTheme ?? selectedTheme;
      // Storage can be unavailable in restrictive browser modes; keep the one-time selection.
    }

    setTheme(selectedTheme);
    setIsThemeReady(true);
  }, []);

  const cssVars = useMemo(
    () => ({
      "--theme-accent": theme.accent,
      "--theme-accent-soft": theme.accentSoft,
      "--theme-accent-muted": theme.accentMuted,
      "--theme-surface-tint": theme.surfaceTint,
      "--theme-border-tint": theme.borderTint,
      "--theme-glow": theme.glow,
      "--theme-background-image": `url(${theme.background})`,
      "--theme-background-position": theme.backgroundPosition,
      "--theme-background-overlay": theme.backgroundOverlay,
    }) as CSSProperties,
    [theme],
  );

  return (
    <VisualThemeContext.Provider value={theme}>
      <div
        className={`visualThemeRoot${isThemeReady ? " visualThemeReady" : ""}`}
        style={cssVars}
        data-visual-theme={theme.id}
      >
        <div className="pageThemeBackground" aria-hidden="true" />
        <div className="pageContent">{children}</div>
      </div>
    </VisualThemeContext.Provider>
  );
}
