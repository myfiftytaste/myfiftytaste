"use client";

import { useEffect, useRef, useState } from "react";
import ErrorScreen from "../../../components/ErrorScreen";
import LoadingScreen from "../../../components/LoadingScreen";
import ProfileView from "../../../components/ProfileView";
import { ApiError, fetchCachedProfile, getJobStatus, postProfile, type CachedProfilePayload } from "../../../lib/apiClient";

// Intervalle de polling de GET /api/job/{id} — dans la fourchette demandée
// (1,5 à 2 s).
const POLL_INTERVAL_MS = 1750;

type Phase = "checking" | "loading" | "merging" | "ready" | "error";

// Cette page est volontairement auto-suffisante : que l'utilisateur arrive
// via la saisie sur l'accueil (avec ?job=... déjà fourni), via un lien
// partagé, ou plus tard via la navigation sociale du Hall of Fame, le même
// enchaînement s'applique — vérifier le cache, sinon poster et attendre.
export default function ProfilePage({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams: { job?: string };
}) {
  const username = decodeURIComponent(params.username);
  const [phase, setPhase] = useState<Phase>("checking");
  const [jobId, setJobId] = useState<string | null>(searchParams.job ?? null);
  const [profile, setProfile] = useState<CachedProfilePayload | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const mergeDoneRef = useRef(false);
  const profileRef = useRef<CachedProfilePayload | null>(null);

  // Étape 1 : cache frais ou nouveau job. Sautée si un job_id est déjà fourni
  // par l'accueil (il vient d'être créé côté serveur, inutile de reposter).
  useEffect(() => {
    if (jobId) {
      setPhase("loading");
      return;
    }

    let cancelled = false;

    async function resolveInitialState() {
      try {
        const cached = await fetchCachedProfile(username);
        if (cancelled) return;
        if (cached) {
          setProfile(cached);
          setPhase("ready");
          return;
        }

        const result = await postProfile(username);
        if (cancelled) return;
        if (result.cached) {
          setProfile(result.profile);
          setPhase("ready");
        } else {
          setJobId(result.job_id);
          setPhase("loading");
        }
      } catch (err) {
        if (cancelled) return;
        // Un 429 ici vient du rate limit IP de POST /api/profile (pas d'un
        // job) : pas d'error_code en base, on réutilise directement la même
        // clé côté écran pour afficher le même message rassurant.
        if (err instanceof ApiError && err.status === 429) setErrorCode("rate_limited");
        setPhase("error");
      }
    }

    resolveInitialState();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Étape 2 : polling du job tant qu'il est queued/running.
  useEffect(() => {
    if (phase !== "loading" || !jobId) return;

    let cancelled = false;

    async function poll() {
      try {
        const status = await getJobStatus(jobId as string);
        if (cancelled) return;
        if (status.status === "done") {
          setPhase("merging");
        } else if (status.status === "error") {
          setErrorCode(status.error_code);
          setPhase("error");
        }
      } catch {
        if (!cancelled) setPhase("error");
      }
    }

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [phase, jobId, username]);

  // Étape 3 : le job est fini, on récupère le profil pendant que la séquence
  // de convergence/irradiation joue (~1,35 s). Effet séparé du polling
  // ci-dessus : `setPhase("merging")` change `phase`, ce qui déclenche le
  // nettoyage de l'effet de polling — si cette récupération vivait dans ce
  // même effet, son propre `cancelled` serait mis à true par ce nettoyage
  // avant même que la réponse arrive.
  useEffect(() => {
    if (phase !== "merging") return;

    let cancelled = false;
    fetchCachedProfile(username)
      .then((data) => {
        if (cancelled) return;
        profileRef.current = data;
        if (data) setProfile(data);
        if (mergeDoneRef.current && data) setPhase("ready");
      })
      .catch(() => {
        if (!cancelled) setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [phase, username]);

  function handleMergeComplete() {
    mergeDoneRef.current = true;
    if (profileRef.current) setPhase("ready");
    // Sinon la requête profil (démarrée dès `done`) n'est pas encore
    // revenue ; l'effet de polling passera en "ready" dès qu'elle arrive.
  }

  if (phase === "error") {
    return <ErrorScreen username={username} errorCode={errorCode} />;
  }

  if (phase === "ready" && profile) {
    return (
      <div className="profileReveal">
        <ProfileView profile={profile.display_profile} />
      </div>
    );
  }

  // "checking" et "loading" partagent le même écran : la vérification du
  // cache est quasi instantanée, pas besoin d'un état visuel distinct.
  return <LoadingScreen finished={phase === "merging"} onMergeComplete={handleMergeComplete} />;
}
