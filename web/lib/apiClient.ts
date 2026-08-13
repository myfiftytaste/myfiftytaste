// Client HTTP léger vers les routes API (architecture-v1-dynamique.md
// section 3). Pas de fs/pg ici : safe à importer depuis des composants
// "use client" (contrairement à lib/db.ts).

import type { DisplayProfile } from "../components/ProfileView";

export type CachedProfilePayload = {
  username: string;
  display_profile: DisplayProfile;
  metrics: unknown;
  recommendations: unknown;
  generated_at: string;
};

export type PostProfileResult =
  | { cached: true; profile: CachedProfilePayload }
  | { cached: false; job_id: string };

export type JobStatus = "queued" | "running" | "done" | "error";

export type JobStatusResult = {
  status: JobStatus;
  current_step: number | null;
  total_steps: number;
  step_label: string | null;
  error_code?: string;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Requête échouée (${response.status}).`;
    try {
      const body = await response.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // corps non-JSON, on garde le message générique
    }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

export async function postProfile(username: string): Promise<PostProfileResult> {
  const response = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  return parseOrThrow<PostProfileResult>(response);
}

export async function getJobStatus(jobId: string): Promise<JobStatusResult> {
  const response = await fetch(`/api/job/${encodeURIComponent(jobId)}`);
  return parseOrThrow<JobStatusResult>(response);
}

/** Renvoie null sur 404 (profil jamais généré) plutôt que de lancer, puisque c'est un cas normal ici. */
export async function fetchCachedProfile(username: string): Promise<CachedProfilePayload | null> {
  const response = await fetch(`/api/profile/${encodeURIComponent(username)}`);
  if (response.status === 404) return null;
  return parseOrThrow<CachedProfilePayload>(response);
}
