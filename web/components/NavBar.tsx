"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readMyPseudo } from "../lib/myPseudo";

// Barre d'onglets validée sur la maquette du 26/10/2026 : en bas sur téléphone,
// pastille flottante sur ordinateur (même composant, seul le CSS change).
const icons = {
  wrapped: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </>
  ),
  hof: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" />
      <path d="M12 13v4M8.5 20h7M10 17h4" />
    </>
  ),
  jeu: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M10 9.5a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.3v.4" />
      <path d="M12 16h.01" />
    </>
  ),
  divers: (
    <g fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="19" cy="12" r="1.9" />
    </g>
  ),
};

export default function NavBar() {
  const pathname = usePathname() ?? "/";
  // Lu après le premier rendu : le serveur ne connaît pas le cookie au moment du rendu de la mise en page.
  const [myPseudo, setMyPseudo] = useState<string | null>(null);
  useEffect(() => setMyPseudo(readMyPseudo()), [pathname]);

  const tabs = [
    {
      key: "wrapped",
      label: "Mon Wrapped",
      href: myPseudo ? `/profile/${encodeURIComponent(myPseudo)}` : "/",
      active: pathname === "/" || pathname.startsWith("/profile/"),
    },
    { key: "hof", label: "Hall of Fame", href: "/hall-of-fame", active: pathname.startsWith("/hall-of-fame") },
    { key: "jeu", label: "Jeu", href: "/jeu", active: pathname.startsWith("/jeu"), soon: true },
    { key: "divers", label: "Divers", href: "/divers", active: pathname.startsWith("/divers") || pathname.startsWith("/feedback") },
  ] as const;

  return (
    <nav className="navBar" aria-label="Navigation principale">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`navBarTab${tab.active ? " navBarTabActive" : ""}`}
          aria-current={tab.active ? "page" : undefined}
        >
          <span className="navBarIcon">
            <svg
              aria-hidden="true"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {icons[tab.key]}
            </svg>
            {"soon" in tab ? <span className="navBarSoon">Bientôt</span> : null}
          </span>
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
