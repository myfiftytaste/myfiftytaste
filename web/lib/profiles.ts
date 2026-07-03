import availableProfiles from "../public/profiles/available_profiles.json";
import tanguytareData from "../public/profiles/tanguytare_display_profile.json";
import mathouixData from "../public/profiles/mathouix_display_profile.json";
import crazykungfuData from "../public/profiles/crazykungfu_display_profile.json";
import picoliflData from "../public/profiles/picolifl_display_profile.json";
import tobiashottinData from "../public/profiles/tobiashottin_display_profile.json";
import lucasldData from "../public/profiles/Lucasld_display_profile.json";
import mathmonData from "../public/profiles/mathmon_display_profile.json";
import type { DisplayProfile } from "../components/ProfileView";

const profilesByCanonicalName: Record<string, DisplayProfile> = {
  tanguytare: tanguytareData as DisplayProfile,
  mathouix: mathouixData as DisplayProfile,
  crazykungfu: crazykungfuData as DisplayProfile,
  picolifl: picoliflData as DisplayProfile,
  tobiashottin: tobiashottinData as DisplayProfile,
  Lucasld: lucasldData as DisplayProfile,
  mathmon: mathmonData as DisplayProfile,
};

export function getProfile(username: string) {
  const normalizedUsername = username.trim().replace(/^@+/, "").toLowerCase();
  const entry = availableProfiles.profiles.find(
    ({ input, canonical }) =>
      input.toLowerCase() === normalizedUsername || canonical.toLowerCase() === normalizedUsername,
  );

  return entry ? profilesByCanonicalName[entry.canonical] ?? null : null;
}

export function getAvailableUsernames() {
  return Array.from(
    new Set(availableProfiles.profiles.flatMap(({ input, canonical }) => [input, canonical])),
  );
}
