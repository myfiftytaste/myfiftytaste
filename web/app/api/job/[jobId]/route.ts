import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../../lib/db";

// GET /api/job/{job_id} — architecture-v1-dynamique.md section 3.
//   → 200 { status, current_step, total_steps: 8, step_label, error_code? }

// 8 étapes fixes, cf. PIPELINE_STEPS dans scripts/build_full_profile.py
// (repris tel quel par worker.py, qui écrit current_step/step_label).
const TOTAL_STEPS = 8;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, { params }: { params: { jobId: string } }) {
  const { jobId } = params;

  if (!UUID_PATTERN.test(jobId)) {
    return NextResponse.json({ error: "job_id invalide." }, { status: 400 });
  }

  const pool = getPool();
  const result = await pool.query<{
    status: string;
    current_step: number | null;
    step_label: string | null;
    error_code: string | null;
  }>("SELECT status, current_step, step_label, error_code FROM job WHERE id = $1", [jobId]);

  const job = result.rows[0];
  if (!job) {
    return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    current_step: job.current_step,
    total_steps: TOTAL_STEPS,
    step_label: job.step_label,
    ...(job.error_code ? { error_code: job.error_code } : {}),
  });
}
