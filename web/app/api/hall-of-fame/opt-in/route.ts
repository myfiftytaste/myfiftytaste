import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

// Hall of Fame data lives outside the Next app, in the shared Python
// pipeline's output directory (data/output/hall_of_fame/<month>/<username>_snapshot.json).
// process.cwd() is the `web/` directory when running via `next dev`/`next start`.
const HOF_DIR = path.join(process.cwd(), "..", "data", "output", "hall_of_fame");

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{1,50}$/;

function snapshotPath(month: string, username: string): string | null {
  if (!MONTH_PATTERN.test(month) || !USERNAME_PATTERN.test(username)) {
    return null;
  }
  const monthDir = path.resolve(HOF_DIR, month);
  const filePath = path.resolve(monthDir, `${username}_snapshot.json`);
  // Defense in depth: even with the regexes above, make sure the resolved
  // path never escapes the Hall of Fame output directory.
  if (!filePath.startsWith(path.resolve(HOF_DIR) + path.sep)) {
    return null;
  }
  return filePath;
}

async function readSnapshot(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username") ?? "";
  const month = request.nextUrl.searchParams.get("month") ?? "";
  const filePath = snapshotPath(month, username);

  if (!filePath) {
    return NextResponse.json({ error: "Invalid username or month." }, { status: 400 });
  }

  const snapshot = await readSnapshot(filePath);
  if (!snapshot) {
    return NextResponse.json({ exists: false, optedIn: null });
  }

  return NextResponse.json({ exists: true, optedIn: snapshot.opted_in ?? null });
}

export async function POST(request: NextRequest) {
  let body: { username?: string; month?: string; optedIn?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { username, month, optedIn } = body;
  if (typeof username !== "string" || typeof month !== "string" || typeof optedIn !== "boolean") {
    return NextResponse.json({ error: "username, month and optedIn are required." }, { status: 400 });
  }

  const filePath = snapshotPath(month, username);
  if (!filePath) {
    return NextResponse.json({ error: "Invalid username or month." }, { status: 400 });
  }

  const snapshot = await readSnapshot(filePath);
  if (!snapshot) {
    return NextResponse.json({ error: "No frozen snapshot for this profile yet." }, { status: 404 });
  }

  // The choice can change later, but it always applies to the same frozen
  // metrics_snapshot — never a more favorable recalculation.
  snapshot.opted_in = optedIn;
  snapshot.opted_in_at = new Date().toISOString();
  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf-8");

  return NextResponse.json({ exists: true, optedIn });
}
