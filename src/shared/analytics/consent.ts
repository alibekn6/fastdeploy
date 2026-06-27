import { env } from "@/shared/config/env";
import { posthog } from "./posthog";

export function analyticsConfigured() {
  return Boolean(env.NEXT_PUBLIC_POSTHOG_KEY);
}

export function acceptConsent() {
  if (!analyticsConfigured()) return;
  posthog.set_config({ persistence: "localStorage+cookie" });
  posthog.opt_in_capturing();
}

export function rejectConsent() {
  if (!analyticsConfigured()) return;
  posthog.opt_out_capturing();
}

export function consentDecided() {
  if (!analyticsConfigured()) return true; // nothing to decide when unconfigured
  return posthog.has_opted_in_capturing() || posthog.has_opted_out_capturing();
}
