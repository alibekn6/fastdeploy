"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { env } from "@/shared/config/env";

/**
 * Server→client demo message contract (spec §2.7): JSON text frames validated
 * with `safeParse` — frames with an unknown `type` or failing validation are
 * silently dropped, never thrown, never rendered. The demo is receive-only;
 * binary frames are out of scope.
 */
export const WsMessageSchema = z.object({
  type: z.literal("message"),
  id: z.string(),
  text: z.string(),
  at: z.string(),
});

export type WsMessage = z.infer<typeof WsMessageSchema>;

export type WsStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 4_000;
/** App-defined "auth expired" close code (spec §2.7). */
const AUTH_EXPIRED_CODE = 4001;

interface ConnectionEvents {
  onStatus: (status: WsStatus) => void;
  onMessage: (message: WsMessage) => void;
}

/**
 * Reconnecting WebSocket state machine behind {@link useWebSocket} — exported
 * for direct unit-testing with a mocked `WebSocket` and fake timers (A14).
 *
 * Close-code policy (spec §2.7):
 * - `1000` (normal closure) → `disconnected`, stay closed;
 * - `4001` (auth expired)   → call `auth/refresh` directly, reconnect on
 *   success; on refresh failure → `disconnected`, stay closed, NO redirect
 *   (the HTTP hook's 401 path owns the session escape);
 * - anything else → backoff reconnect 1s → 2s → 4s (capped), reset to 1s on
 *   every successful `open`. Errors always surface as a close event, so the
 *   `close` listener is the single recovery entry point.
 *
 * The returned cleanup is idempotent: closes the socket, clears any pending
 * reconnect timer, removes listeners (via AbortController); safe to call twice.
 */
export function createWebSocketConnection(url: string, events: ConnectionEvents): () => void {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let backoffMs = INITIAL_BACKOFF_MS;
  let disposed = false;
  const controller = new AbortController();

  const scheduleReconnect = () => {
    events.onStatus("reconnecting");
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      open();
    }, backoffMs);
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  };

  const refreshThenReconnect = () => {
    events.onStatus("reconnecting");
    // Direct refresh call, mirroring the HTTP hook's transport (cookies ride
    // `credentials: "include"`); the response body is never parsed — only
    // `response.ok` decides.
    fetch(new URL("auth/refresh", env.NEXT_PUBLIC_API_URL), {
      method: "POST",
      credentials: "include",
    })
      .then((response) => {
        if (disposed) return;
        if (response.ok) open();
        else events.onStatus("disconnected");
      })
      .catch(() => {
        if (!disposed) events.onStatus("disconnected");
      });
  };

  const handleClose = (event: CloseEvent) => {
    if (disposed) return;
    if (event.code === 1000) events.onStatus("disconnected");
    else if (event.code === AUTH_EXPIRED_CODE) refreshThenReconnect();
    else scheduleReconnect();
  };

  const open = () => {
    socket = new WebSocket(url);
    const { signal } = controller;
    socket.addEventListener(
      "open",
      () => {
        backoffMs = INITIAL_BACKOFF_MS;
        events.onStatus("connected");
      },
      { signal },
    );
    socket.addEventListener(
      "message",
      (event) => {
        if (typeof event.data !== "string") return;
        let raw: unknown;
        try {
          raw = JSON.parse(event.data);
        } catch {
          return; // non-JSON frame — dropped
        }
        const parsed = WsMessageSchema.safeParse(raw);
        if (parsed.success) events.onMessage(parsed.data);
      },
      { signal },
    );
    socket.addEventListener("close", handleClose, { signal });
  };

  events.onStatus("connecting");
  open();

  return () => {
    disposed = true;
    controller.abort();
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    socket?.close();
    socket = null;
  };
}

/**
 * Reusable reconnecting-WebSocket hook (network seam beside `http.ts`). Auth
 * rides the httpOnly cookies on the same-site upgrade request — never
 * `?token=` query params (log-leak risk).
 */
export function useWebSocket(url: string): { status: WsStatus; messages: WsMessage[] } {
  const [status, setStatus] = useState<WsStatus>("connecting");
  const [messages, setMessages] = useState<WsMessage[]>([]);

  useEffect(() => {
    setMessages([]);
    return createWebSocketConnection(url, {
      onStatus: setStatus,
      onMessage: (message) => setMessages((previous) => [...previous, message]),
    });
  }, [url]);

  return { status, messages };
}
