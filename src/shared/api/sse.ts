"use client";
import { useEffect, useState } from "react";
import { SSE_EVENT_NAMES, type SseEventMessage, SseEventSchema } from "@/shared/api/sse-schema";

export type SseStatus = "connecting" | "open" | "reconnecting" | "closed";

interface SseConnectionEvents {
  onStatus: (status: SseStatus) => void;
  onMessage: (message: SseEventMessage) => void;
}

/**
 * SSE connection state machine behind {@link useSse} — exported for direct
 * unit-testing with a mocked `EventSource` (`FakeEventSource`).
 *
 * Unlike `createWebSocketConnection`, this does NOT reimplement reconnect or
 * backoff: `EventSource` reconnects itself (the browser retries automatically
 * on a dropped connection, honoring the stream's `retry:` hint or a browser
 * default) — the whole point of contrasting it with the WS example. This
 * wrapper only translates `readyState` transitions into a status a UI can
 * render: on an `error` event, `readyState === CONNECTING` means the browser
 * is about to retry (`reconnecting`); `readyState === CLOSED` means it gave up
 * for good (a fatal HTTP status, or our own `close()`) — surfaced as `closed`.
 *
 * The returned cleanup is idempotent: closes the source, removes every
 * listener, and is safe to call twice; no status/message update fires after
 * cleanup even if the underlying source still emits events.
 */
export function createSseConnection(url: string, events: SseConnectionEvents): () => void {
  let disposed = false;
  const source = new EventSource(url);

  const handleOpen = () => {
    if (disposed) return;
    events.onStatus("open");
  };

  const handleError = () => {
    if (disposed) return;
    events.onStatus(source.readyState === EventSource.CONNECTING ? "reconnecting" : "closed");
  };

  const handleNamedEvent = (event: Event) => {
    if (disposed) return;
    if (!(event instanceof MessageEvent) || typeof event.data !== "string") return;
    let raw: unknown;
    try {
      raw = JSON.parse(event.data);
    } catch {
      return; // non-JSON frame — dropped
    }
    const parsed = SseEventSchema.safeParse(raw);
    if (parsed.success) events.onMessage(parsed.data);
  };

  source.addEventListener("open", handleOpen);
  source.addEventListener("error", handleError);
  for (const name of SSE_EVENT_NAMES) source.addEventListener(name, handleNamedEvent);

  events.onStatus("connecting");

  return () => {
    if (disposed) return;
    disposed = true;
    source.removeEventListener("open", handleOpen);
    source.removeEventListener("error", handleError);
    for (const name of SSE_EVENT_NAMES) source.removeEventListener(name, handleNamedEvent);
    source.close();
  };
}

/**
 * Reusable EventSource hook (network seam beside `websocket.ts`). SSE is
 * ordinary HTTP: auth rides the same httpOnly cookies as every other
 * same-origin request, with no `withCredentials` needed and no separate
 * upgrade handshake to reason about.
 */
export function useSse(url: string): { status: SseStatus; messages: SseEventMessage[] } {
  const [status, setStatus] = useState<SseStatus>("connecting");
  const [messages, setMessages] = useState<SseEventMessage[]>([]);

  useEffect(() => {
    setMessages([]);
    return createSseConnection(url, {
      onStatus: setStatus,
      onMessage: (message) => setMessages((previous) => [...previous, message]),
    });
  }, [url]);

  return { status, messages };
}
