import { env } from "@/shared/config/env";

/**
 * Mock-mode-only e2e control (404s otherwise — it does nothing in production).
 * E2E specs cannot call `server.use(...)` inside the Next server process, so
 * this route forwards the failure-injection body to the MSW-intercepted
 * `__mock/comments-failure` endpoint via a server-side fetch, flipping the
 * flag inside the module graph `instrumentation.ts` registered.
 * See mock-control.ts; exposed at app/api/mock-control/route.ts.
 */
export async function POST(request: Request) {
  if (env.NEXT_PUBLIC_API_MOCKING !== "enabled") return new Response(null, { status: 404 });
  // Deliberate raw fetch (not the shared ky `http` client): this is test-only
  // plumbing to the MSW-intercepted control endpoint, and the ky client's
  // retry/worker-gate hooks would only get in the way here.
  const response = await fetch(new URL("__mock/comments-failure", env.NEXT_PUBLIC_API_URL), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await request.text(),
  });
  return new Response(null, { status: response.status });
}
