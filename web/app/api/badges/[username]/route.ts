import { NextRequest, NextResponse } from "next/server";
import { getBadgesForUser } from "../../../../lib/badges";
import { MAX_PINNED } from "../../../../lib/badgeSelection";
import { getPool, normalizeUsername, USERNAME_PATTERN } from "../../../../lib/db";
import { OWNER_COOKIE, verifyOwner } from "../../../../lib/ownerCookie";

// « Mes badges » (27/10/2026). GET : tous les badges d'un pseudo, et si ce navigateur peut choisir
// (cookie signé fifty_owner, le même que pour le Hall of Fame). POST : enregistre le choix.

function usernameFrom(raw: string): string | null {
  try {
    const username = normalizeUsername(decodeURIComponent(raw));
    return USERNAME_PATTERN.test(username) ? username : null;
  } catch {
    return null;
  }
}

function isOwner(request: NextRequest, username: string) {
  return verifyOwner(request.cookies.get(OWNER_COOKIE)?.value) === username;
}

export async function GET(request: NextRequest, { params }: { params: { username: string } }) {
  const username = usernameFrom(params.username);
  if (!username) return NextResponse.json({ error: "Pseudo invalide." }, { status: 400 });
  return NextResponse.json({ badges: await getBadgesForUser(username), canEdit: isOwner(request, username) });
}

export async function POST(request: NextRequest, { params }: { params: { username: string } }) {
  const username = usernameFrom(params.username);
  if (!username) return NextResponse.json({ error: "Pseudo invalide." }, { status: 400 });
  if (!isOwner(request, username)) {
    return NextResponse.json({ error: "Pour choisir, lance d'abord ton wrapped depuis ce navigateur." }, { status: 403 });
  }

  let pinned: unknown;
  try {
    pinned = (await request.json())?.pinned;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!Array.isArray(pinned) || pinned.length > MAX_PINNED || !pinned.every((id) => Number.isSafeInteger(id))) {
    return NextResponse.json({ error: `pinned : jusqu'à ${MAX_PINNED} identifiants de badges.` }, { status: 400 });
  }

  // Une seule requête : les badges cités passent à true, tous les autres de ce pseudo à false.
  // Un identifiant qui n'appartient pas à ce pseudo ne touche donc à rien.
  await getPool().query("UPDATE badge SET pinned = (id = ANY($2::bigint[])) WHERE username = $1", [username, pinned]);
  return NextResponse.json({ badges: await getBadgesForUser(username), canEdit: true });
}
