import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { api, handlers } from "./handlers";
import {
  COMMENTS_FAILURE_HEADER,
  MOCK_COMMENTS_FAILURE_COOKIE,
  parseFailureStatus,
} from "./mock-control";

/**
 * Read the e2e comments-failure signal from the CURRENT Next request. The SSR
 * prefetch starts inside the render's async context, so `cookies()` still
 * resolves the originating navigation here — which scopes the override to the
 * browser context that planted the cookie instead of the whole dev-server
 * process, so parallel Playwright workers no longer collide. Outside a Next
 * request scope (integration tests) `cookies()` throws and we report no failure.
 */
async function requestScopedCommentsFailure(): Promise<number | null> {
  try {
    const { cookies } = await import("next/headers");
    return parseFailureStatus((await cookies()).get(MOCK_COMMENTS_FAILURE_COOKIE)?.value);
  } catch {
    return null;
  }
}

/**
 * Server runtime only. The comments handler in front translates the per-request
 * cookie into the failure the shared handler already understands; returning
 * `undefined` falls through to the real handler whenever no override applies.
 */
export const server = setupServer(
  http.get(api("/posts/:id/comments"), async ({ request }) => {
    if (request.headers.has(COMMENTS_FAILURE_HEADER)) return undefined;
    const status = await requestScopedCommentsFailure();
    return status === null ? undefined : new HttpResponse(null, { status });
  }),
  ...handlers,
);
