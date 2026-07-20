"use client";
import { type ReactNode, useEffect } from "react";
import { writeMockSessionCookies } from "@/features/auth";
import { markMockWorkerReady } from "@/shared/api/mocks/worker-ready";
import { setRefreshedTokensSink } from "@/shared/api/refreshed-tokens";
import { env } from "@/shared/config/env";

const ENABLED = env.NEXT_PUBLIC_API_MOCKING === "enabled";

// Children render immediately — including during SSR. Returning null until the
// worker started looked harmless but suppressed the entire server-rendered body
// in mock mode, so Next flushed an empty 200 shell for every page (no real SSR
// HTML, no notFound() 404s). The "no fetch before the worker is live" guarantee
// lives in the ky transport instead, which awaits mockWorkerReady() in the
// browser (see src/shared/api/mocks/worker-ready.ts).
export function MswProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!ENABLED) return;
    // The app layer is the only place that reaches both `shared/api` and
    // `features/auth`, so it wires the refreshed-token sink: a Service Worker
    // cannot set httpOnly cookies, so a transparent refresh must persist its
    // new access token to document.cookie itself — otherwise every later 401
    // re-refreshes against the stale cookie until sign-in rewrites it.
    setRefreshedTokensSink(writeMockSessionCookies);
    void (async () => {
      const { worker } = await import("@/shared/api/mocks/browser");
      await worker.start({ onUnhandledRequest: "bypass" });
      markMockWorkerReady();
    })();
    return () => setRefreshedTokensSink(null);
  }, []);
  return <>{children}</>;
}
