import { NextResponse, type NextRequest } from "next/server";

// Mode maintenance (lot 12, livraison de la V3). Variables Vercel :
// - MAINTENANCE_MODE=1 ferme le site : chaque page affiche /maintenance, les API répondent 503.
// - MAINTENANCE_BYPASS_KEY : ouvrir une fois https://50films.fr/?passe=<clé> pose un cookie qui laisse
//   Tanguy naviguer normalement (tests en production) pendant la maintenance.
// Le middleware lit ces variables au déploiement : après un changement, faire « Redeploy ».
const COOKIE = "fifty_passe";

export function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE !== "1") return NextResponse.next();
  const key = process.env.MAINTENANCE_BYPASS_KEY;
  const { searchParams, pathname } = request.nextUrl;

  if (key && searchParams.get("passe") === key) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("passe");
    const response = NextResponse.redirect(url);
    response.cookies.set(COOKIE, key, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 });
    return response;
  }
  if (key && request.cookies.get(COOKIE)?.value === key) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Fifty est en maintenance." }, { status: 503, headers: { "Retry-After": "3600" } });
  }
  return NextResponse.rewrite(new URL("/maintenance", request.url), { status: 503 });
}

export const config = {
  // Ni les fichiers du site (scripts, polices, images), ni la page de maintenance elle-même.
  matcher: ["/((?!_next/|maintenance|branding/|favicon.ico|icon.svg|apple-icon.png|robots.txt).*)"],
};
