import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db";

// Titres proposés par la saisie assistée de Fiftyguess (français et originaux, plusieurs centaines).
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getPool().query<{ title: string }>("SELECT title FROM game_title ORDER BY title");
  return NextResponse.json(
    result.rows.map((row) => row.title),
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
