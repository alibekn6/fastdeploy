import { createSseStream } from "@/shared/api/sse-stream";

// Every connection is unique — never cache, never buffer, never prerender.
export const dynamic = "force-dynamic";

/**
 * `/api/sse` (bead F11): a real Next route handler emitting `text/event-stream`
 * — see the comment on `createSseStream` for why that's the point of this
 * example. Cookies ride this request automatically (same-origin
 * `EventSource`), and it passes through the same proxy as every other page.
 * Outside the site-wide `proxy.ts` matcher (which excludes `api`), so it is
 * never locale-prefixed or auth-redirected.
 */
export function GET(request: Request): Response {
  return new Response(createSseStream(request.signal), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}
