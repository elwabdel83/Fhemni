"use client";

import type { ExplanationResult } from "./types";

const HISTORY_KEY = "fhemni_history_v1";
const PRIVACY_KEY = "fhemni_save_history_v1";
const SEEN_ONBOARDING_KEY = "fhemni_seen_onboarding_v1";
const USAGE_COUNT_KEY = "fhemni_usage_count_v1";
const AD_CREDIT_KEY = "fhemni_ad_free_credits_v1";

export type HistoryItem = {
  id: string;
  createdAt: number;
  category: string;
  categoryEmoji: string;
  simpleExplanation: string;
  result: ExplanationResult;
  profileId: string;
  favorite?: boolean;
};

const MAX_HISTORY = 30;

export function getSaveHistoryPreference(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(PRIVACY_KEY);
  return v === null ? true : v === "1";
}

export function setSaveHistoryPreference(value: boolean) {
  window.localStorage.setItem(PRIVACY_KEY, value ? "1" : "0");
}

export function getHistory(profileId?: string): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as HistoryItem[];
    if (!profileId) return items;
    return items.filter((i) => (i.profileId ?? "default") === profileId);
  } catch {
    return [];
  }
}

export function addToHistory(result: ExplanationResult, profileId: string) {
  if (!getSaveHistoryPreference()) return;
  const items = getHistory();
  const item: HistoryItem = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    category: result.category,
    categoryEmoji: result.categoryEmoji,
    simpleExplanation: result.simpleExplanation,
    result,
    profileId,
  };
  const merged = [item, ...items];
  // Trim to MAX_HISTORY, but never drop a favorited item for being old —
  // only the oldest *non-favorite* entries get pushed out.
  const favorites = merged.filter((i) => i.favorite);
  const rest = merged.filter((i) => !i.favorite);
  const keptRest = rest.slice(0, Math.max(0, MAX_HISTORY - favorites.length));
  const next = [...favorites, ...keptRest].sort((a, b) => b.createdAt - a.createdAt);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function toggleFavorite(id: string): boolean {
  const items = getHistory();
  let nowFavorite = false;
  const next = items.map((i) => {
    if (i.id !== id) return i;
    nowFavorite = !i.favorite;
    return { ...i, favorite: nowFavorite };
  });
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return nowFavorite;
}

export function clearHistory(profileId?: string) {
  if (!profileId) {
    window.localStorage.removeItem(HISTORY_KEY);
    return;
  }
  const remaining = getHistory().filter((i) => (i.profileId ?? "default") !== profileId);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(remaining));
}

export function removeHistoryItem(id: string) {
  const next = getHistory().filter((i) => i.id !== id);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SEEN_ONBOARDING_KEY) === "1";
}

export function markOnboardingSeen() {
  window.localStorage.setItem(SEEN_ONBOARDING_KEY, "1");
}

// Very small local counter used only to decide when it'd be this app's
// "turn" to ask about an ad — never sent anywhere, and never blocks the
// result on its own (see getAdFreeCredits below for how it's actually
// used: as a dismissible, voluntary offer, not a forced interstitial).
export function bumpUsageCountAndShouldShowAd(everyN = 4): boolean {
  if (typeof window === "undefined") return false;
  const current = Number(window.localStorage.getItem(USAGE_COUNT_KEY) ?? "0") + 1;
  window.localStorage.setItem(USAGE_COUNT_KEY, String(current));
  return current % everyN === 0;
}

/** How many "watch a short ad, skip the next few ad offers" credits the
 * person has banked by voluntarily choosing to watch one. */
export function getAdFreeCredits(): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(AD_CREDIT_KEY) ?? "0");
}

export function addAdFreeCredits(n: number) {
  const next = getAdFreeCredits() + n;
  window.localStorage.setItem(AD_CREDIT_KEY, String(next));
}

/** Spends one credit if available. Returns true if a credit was spent
 * (meaning: don't show the ad offer this time). */
export function consumeAdFreeCreditIfAny(): boolean {
  const current = getAdFreeCredits();
  if (current <= 0) return false;
  window.localStorage.setItem(AD_CREDIT_KEY, String(current - 1));
  return true;
}
