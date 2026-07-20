"use client";
import { type ReactNode, useEffect } from "react";
import { markMockWorkerReady } from "@/shared/api/mocks/worker-ready";
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
    void (async () => {
      const { worker } = await import("@/shared/api/mocks/browser");
      await worker.start({ onUnhandledRequest: "bypass" });
      markMockWorkerReady();
    })();
  }, []);
  return <>{children}</>;
}
