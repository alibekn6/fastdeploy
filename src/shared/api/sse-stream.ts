import type { SSE_EVENT_NAMES, SseEventMessage } from "@/shared/api/sse-schema";

const DEFAULT_INTERVAL_MS = 1_000;

function encodeFrame(message: SseEventMessage): string {
  return `event: ${message.type}\ndata: ${JSON.stringify(message)}\n\n`;
}

/**
 * Build the `text/event-stream` body for `/api/sse` (bead F11): a REAL Next
 * route handler, not an MSW mock. That is the key contrast with the WebSocket
 * example: SSE is ordinary HTTP, so unlike the WS upgrade it rides the same
 * origin, the same httpOnly auth cookies, and this app's own proxy — and it
 * behaves identically in the production build whether MSW mocking is on or
 * off. (A Storybook-only MSW mock does exist, `sse-handlers.ts` — Storybook
 * has no real Next server to answer this route, so it reuses this exact
 * stream builder to fake one.)
 *
 * Emits one `notice` event immediately, then an `update` event every
 * `intervalMs` until `signal` aborts (the client disconnected) or the
 * consumer stops reading (`cancel()` — e.g. `EventSource.close()`).
 */
export function createSseStream(
  signal: AbortSignal,
  { intervalMs = DEFAULT_INTERVAL_MS }: { intervalMs?: number } = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let nextId = 1;
  let interval: ReturnType<typeof setInterval> | undefined;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (type: (typeof SSE_EVENT_NAMES)[number], text: string) => {
        const message: SseEventMessage = {
          type,
          id: String(nextId++),
          text,
          at: new Date().toISOString(),
        };
        controller.enqueue(encoder.encode(encodeFrame(message)));
      };

      push("notice", "Connected to the SSE demo stream");
      interval = setInterval(() => push("update", `Live update #${nextId}`), intervalMs);

      const stop = () => {
        if (interval !== undefined) clearInterval(interval);
        interval = undefined;
        try {
          controller.close();
        } catch {
          // already closed/errored — nothing to do
        }
      };
      signal.addEventListener("abort", stop, { once: true });
    },
    cancel() {
      if (interval !== undefined) clearInterval(interval);
      interval = undefined;
    },
  });
}
