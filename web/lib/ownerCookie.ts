// Serveur uniquement (node:crypto). Cookie signé qui prouve que CE navigateur a lancé ou
// rechargé le profil de ce pseudo : c'est lui qui autorise le choix « Je veux ma place » du
// Hall of Fame (audit du 26/10/2026, #2).
// Limite assumée : sans comptes, n'importe qui peut générer le profil de Bob et obtenir ce
// cookie pour « bob ». Il barre la triche en une ligne, pas un tricheur appliqué.
import { createHmac, timingSafeEqual } from "node:crypto";

export const OWNER_COOKIE = "fifty_owner";
export const OWNER_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

// Sans secret on refuse tout : jamais de repli vers « tout le monde passe ».
function secret(): string | null {
  return process.env.HOF_COOKIE_SECRET?.trim() || null;
}

function mac(key: string, username: string, timestampMs: number): string {
  return createHmac("sha256", key).update(`${username}|${timestampMs}`).digest("hex");
}

/** `pseudo.timestampMs.hmac`, ou null si HOF_COOKIE_SECRET est absent. `username` : pseudo normalisé. */
export function signOwner(username: string, now = Date.now()): string | null {
  const key = secret();
  return key ? `${username}.${now}.${mac(key, username, now)}` : null;
}

/** Le pseudo signé si la valeur est authentique et a moins de 400 jours, sinon null. */
export function verifyOwner(value: string | null | undefined, now = Date.now()): string | null {
  const key = secret();
  const parts = value?.split(".");
  if (!key || !parts || parts.length !== 3) return null;
  const [username, timestamp, given] = parts;
  const timestampMs = Number(timestamp);
  if (!username || !Number.isInteger(timestampMs) || now - timestampMs > OWNER_MAX_AGE_SECONDS * 1000) return null;
  const expected = Buffer.from(mac(key, username, timestampMs), "hex");
  const received = Buffer.from(given, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected) ? username : null;
}
