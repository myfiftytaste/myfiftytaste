import { NextRequest, NextResponse } from "next/server";
import { getPool, normalizeUsername, USERNAME_PATTERN } from "../../../lib/db";

// POST /api/feedback — un champ par sujet plutôt qu'un pavé unique
// (migrations/003_generation_log_feedback.sql), pour rester exploitable en
// colonnes CSV depuis v_feedback_export. Aucun GET : pas de lecture publique.

const RESONATES_VALUES = new Set(["oui", "a_moitie", "pas_du_tout"]);
const DEVICE_VALUES = new Set(["mobile", "desktop"]);

const TAG_FIELDS = [
  "design_detail",
  "clarte_detail",
  "stats_detail",
  "recos_detail",
  "hof_detail",
  "mobile_detail",
  "bug_detail",
  "idee_detail",
  "autre_detail",
] as const;

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const tagValues = Object.fromEntries(TAG_FIELDS.map((field) => [field, cleanText(body[field])]));
  const generalComment = cleanText(body.general_comment);
  const oneChange = cleanText(body.one_change);

  const resonatesRaw = body.profile_resonates;
  if (resonatesRaw !== undefined && resonatesRaw !== null && !RESONATES_VALUES.has(resonatesRaw as string)) {
    return NextResponse.json({ error: "Valeur invalide pour profile_resonates." }, { status: 400 });
  }
  const profileResonates = (resonatesRaw as string | null | undefined) ?? null;

  const deviceRaw = body.device;
  if (deviceRaw !== undefined && deviceRaw !== null && !DEVICE_VALUES.has(deviceRaw as string)) {
    return NextResponse.json({ error: "Valeur invalide pour device." }, { status: 400 });
  }
  const device = (deviceRaw as string | null | undefined) ?? null;

  const sourcePage = cleanText(body.source_page);

  // Facultatif, mais s'il est fourni il doit ressembler à un vrai pseudo
  // Letterboxd — mêmes règles que partout ailleurs (web/lib/username.ts).
  let username: string | null = null;
  if (typeof body.username === "string" && body.username.trim() !== "") {
    const normalized = normalizeUsername(body.username);
    if (!USERNAME_PATTERN.test(normalized)) {
      return NextResponse.json({ error: "Pseudo Letterboxd invalide." }, { status: 400 });
    }
    username = normalized;
  }

  const hasContent =
    generalComment !== null ||
    oneChange !== null ||
    profileResonates !== null ||
    Object.values(tagValues).some((value) => value !== null);
  if (!hasContent) {
    return NextResponse.json({ error: "Le retour est vide." }, { status: 400 });
  }

  const pool = getPool();
  await pool.query(
    `INSERT INTO feedback (
       design_detail, clarte_detail, stats_detail, recos_detail, hof_detail,
       mobile_detail, bug_detail, idee_detail, autre_detail,
       profile_resonates, general_comment, one_change, username, device, source_page
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      tagValues.design_detail,
      tagValues.clarte_detail,
      tagValues.stats_detail,
      tagValues.recos_detail,
      tagValues.hof_detail,
      tagValues.mobile_detail,
      tagValues.bug_detail,
      tagValues.idee_detail,
      tagValues.autre_detail,
      profileResonates,
      generalComment,
      oneChange,
      username,
      device,
      sourcePage,
    ],
  );

  return NextResponse.json({ ok: true });
}
