"use client";

export type Profile = { id: string; name: string; emoji: string };

const PROFILES_KEY = "fhemni_profiles_v1";
const ACTIVE_PROFILE_KEY = "fhemni_active_profile_v1";

const DEFAULT_PROFILE: Profile = { id: "default", name: "أنا", emoji: "🙂" };

const PROFILE_EMOJIS = ["🙂", "👵", "👴", "👩", "👨", "👧", "👦"];

export function getProfiles(): Profile[] {
  if (typeof window === "undefined") return [DEFAULT_PROFILE];
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    if (!raw) return [DEFAULT_PROFILE];
    const parsed = JSON.parse(raw) as Profile[];
    return parsed.length > 0 ? parsed : [DEFAULT_PROFILE];
  } catch {
    return [DEFAULT_PROFILE];
  }
}

function saveProfiles(profiles: Profile[]) {
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function addProfile(name: string): Profile {
  const profiles = getProfiles();
  const emoji = PROFILE_EMOJIS[profiles.length % PROFILE_EMOJIS.length];
  const profile: Profile = { id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name, emoji };
  saveProfiles([...profiles, profile]);
  return profile;
}

export function removeProfile(id: string) {
  const profiles = getProfiles().filter((p) => p.id !== id);
  saveProfiles(profiles.length > 0 ? profiles : [DEFAULT_PROFILE]);
  if (getActiveProfileId() === id) {
    setActiveProfileId(profiles[0]?.id ?? DEFAULT_PROFILE.id);
  }
}

export function getActiveProfileId(): string {
  if (typeof window === "undefined") return DEFAULT_PROFILE.id;
  return window.localStorage.getItem(ACTIVE_PROFILE_KEY) ?? DEFAULT_PROFILE.id;
}

export function setActiveProfileId(id: string) {
  window.localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}
