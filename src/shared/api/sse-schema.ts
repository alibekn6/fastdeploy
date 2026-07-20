import { z } from "zod";

/**
 * Server→client SSE contract (mirrors `WsMessageSchema` in `websocket.ts`):
 * JSON payloads validated with `safeParse` — frames with an unknown `type` or
 * failing validation are dropped, never thrown, never rendered. `type` doubles
 * as the SSE `event:` field name, so this schema is a discriminated union over
 * every NAMED event `/api/sse` emits (spec bead F11 — "handle named events,
 * not just `message`").
 */
export const SseEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("notice"), id: z.string(), text: z.string(), at: z.string() }),
  z.object({ type: z.literal("update"), id: z.string(), text: z.string(), at: z.string() }),
]);

export type SseEventMessage = z.infer<typeof SseEventSchema>;

/** Every named `event:` the stream emits — the client attaches one listener per name. */
export const SSE_EVENT_NAMES = ["notice", "update"] as const;
