"use client";

const OWN_CODE_KEY = "fhemni_ref_code_v1";
const PENDING_CODE_KEY = "fhemni_ref_pending_v1";
const PENDING_USED_KEY = "fhemni_ref_pending_used_v1";
const UNLOCK_THRESHOLD = 3;

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getOwnReferralCode(): string {
  if (typeof window === "undefined") return "";
  let code = window.localStorage.getItem(OWN_CODE_KEY);
  if (!code) {
    code = randomCode();
    window.localStorage.setItem(OWN_CODE_KEY, code);
  }
  return code;
}

/** Call once on app mount: captures a ?ref=CODE from the URL, if present. */
export function capturePendingReferral() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  const ownCode = window.localStorage.getItem(OWN_CODE_KEY);
  if (ref && ref !== ownCode && !window.localStorage.getItem(PENDING_USED_KEY)) {
    window.localStorage.setItem(PENDING_CODE_KEY, ref);
  }
}

/** Call after the person's first successful explanation. Reports the
 * pending referral (if any) to the server, once, then never again. */
export async function reportReferralCompletionIfPending() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(PENDING_USED_KEY)) return;
  const code = window.localStorage.getItem(PENDING_CODE_KEY);
  if (!code) return;
  window.localStorage.setItem(PENDING_USED_KEY, "1");
  try {
    await fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
  } catch {
    // best-effort only
  }
}

export async function fetchReferralCount(code: string): Promise<number> {
  try {
    const res = await fetch(`/api/referral?code=${encodeURIComponent(code)}`);
    const data = await res.json().catch(() => null);
    return typeof data?.count === "number" ? data.count : 0;
  } catch {
    return 0;
  }
}

export function isAdsFreeUnlocked(count: number): boolean {
  return count >= UNLOCK_THRESHOLD;
}

export const REFERRAL_UNLOCK_THRESHOLD = UNLOCK_THRESHOLD;
