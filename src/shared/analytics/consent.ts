import { env } from "@/shared/config/env";
import { posthog } from "./posthog";

// Track the user's explicit choice separately from posthog's opt state:
// `opt_out_capturing_by_default` makes `has_opted_out_capturing()` return true
// before any decision, so it can't be used to tell whether the banner was answered.
const CONSENT_KEY = "ph_consent_decided";

export function analyticsConfigured() {
  return Boolean(env.NEXT_PUBLIC_POSTHOG_KEY);
}

export function acceptConsent() {
  if (!analyticsConfigured() || typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, "1");
  posthog.set_config({ persistence: "localStorage+cookie" });
  posthog.opt_in_capturing();
}

export function rejectConsent() {
  if (!analyticsConfigured() || typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, "1");
  posthog.opt_out_capturing();
}

export function consentDecided() {
  if (!analyticsConfigured() || typeof window === "undefined") return true;
  return window.localStorage.getItem(CONSENT_KEY) === "1";
}
