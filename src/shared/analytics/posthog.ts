import posthog from "posthog-js";
import { env } from "@/shared/config/env";

export function initAnalytics() {
  if (typeof window === "undefined") return;
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return; // NO-OP when unconfigured
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
    opt_out_capturing_by_default: true,
    persistence: "memory",
  });
}

export { posthog };
