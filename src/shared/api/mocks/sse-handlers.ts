import { http } from "msw";
import { createSseStream } from "@/shared/api/sse-stream";

/**
 * STORYBOOK-ONLY mock for `/api/sse`. The real endpoint (`app/api/sse/route.ts`)
 * is a genuine Next route handler — Storybook has no Next server behind its
 * Vite preview to answer it, so this handler exists purely so the "live"
 * story can render the connected + receiving state. It reuses the exact same
 * `createSseStream` the real route serves, so the framing/content stay in
 * sync with production.
 *
 * Deliberately NOT added to the shared `handlers` array (which
 * `instrumentation.ts` / Node integration tests / the browser `MswProvider`
 * worker register) — in dev, e2e, and prod, `/api/sse` is always the real
 * route, with or without mock mode.
 */
export const sseHandlers = [
  http.get("/api/sse", () => {
    // Never aborted by the caller — MSW's browser worker doesn't expose a
    // per-request abort hook, so cleanup instead relies on the stream's own
    // `cancel()` path, which fires when the browser stops reading (the
    // EventSource is closed / the story unmounts).
    const neverAborts = new AbortController().signal;
    return new Response(createSseStream(neverAborts), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    });
  }),
];
