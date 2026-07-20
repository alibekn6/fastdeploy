import { env } from "@/shared/config/env";

// Deliberately msw-free so the production bundle that imports it stays clean.
//
// "No fetch fires before the browser worker is live" is enforced at the
// transport seam: the ky client awaits `mockWorkerReady()` in a beforeRequest
// hook. Gating the RENDER instead (MswProvider returning null until the worker
// started) suppressed the whole SSR body in mock mode, which let Next flush an
// empty 200 shell for every page — breaking real SSR HTML and notFound()/error
// status codes.
let resolveReady: (() => void) | undefined;

const ready: Promise<void> =
  env.NEXT_PUBLIC_API_MOCKING === "enabled" && typeof window !== "undefined"
    ? new Promise((resolve) => {
        resolveReady = resolve;
      })
    : Promise.resolve();

/** Called by MswProvider once `worker.start()` resolved. */
export function markMockWorkerReady() {
  resolveReady?.();
}

/** Resolved immediately on the server and whenever mocking is disabled. */
export function mockWorkerReady(): Promise<void> {
  return ready;
}
