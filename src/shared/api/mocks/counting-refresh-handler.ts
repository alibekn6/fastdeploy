import { HttpResponse, type HttpResponseResolver, http } from "msw";
import { vi } from "vitest";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/shared/config/auth";
import { env } from "@/shared/config/env";
import { decodeJwtPayload } from "@/shared/lib/route-guard";
import { mintMockJwt } from "./handlers";

/** Matches the shipped handlers' access-token lifetime (seconds). */
const ACCESS_TTL_SECONDS = 900;

/**
 * Contract-faithful `auth/refresh` success resolver: validates ONLY the
 * `refresh_token` cookie (spec §2.4) and answers with the auth `{data}`
 * envelope plus `mock_tokens`, like the shipped handler — and ALSO sets the
 * production `Set-Cookie: access_token=…` header. MSW applies mocked
 * `Set-Cookie` headers to its virtual cookie store, so in Node integration
 * tests the retried request presents the fresh token exactly like a browser
 * riding real backend cookies would.
 */
export const refreshSuccessResolver: HttpResponseResolver = ({ cookies }) => {
  const refreshToken = cookies[REFRESH_COOKIE];
  if (!refreshToken) {
    return HttpResponse.json(
      { error: { code: "invalid_refresh", message: "Refresh token missing" } },
      { status: 401 },
    );
  }
  const claims = decodeJwtPayload(refreshToken);
  const accessToken = mintMockJwt({
    sub: typeof claims?.sub === "string" ? claims.sub : "u1",
    email: typeof claims?.email === "string" ? claims.email : "user@example.com",
    ttlSeconds: ACCESS_TTL_SECONDS,
  });
  return HttpResponse.json(
    { data: { message: "Refreshed", mock_tokens: { access_token: accessToken } } },
    {
      headers: {
        "Set-Cookie": `${SESSION_COOKIE}=${accessToken}; Path=/; SameSite=Lax; Max-Age=${ACCESS_TTL_SECONDS}`,
      },
    },
  );
};

/**
 * Counting `auth/refresh` handler — reusable probe infrastructure (A7/A8/A15):
 * a `vi.fn`-wrapped resolver whose `spy` records every invocation, registered
 * per-test via `server.use(handler)` (or per-story via `parameters.msw`).
 * Defaults to {@link refreshSuccessResolver}; pass a custom resolver for
 * failure variants (e.g. an unconditional 401 for revoked-session scenarios).
 */
export function countingRefreshHandler(resolver: HttpResponseResolver = refreshSuccessResolver) {
  const spy = vi.fn(resolver);
  const handler = http.post(new URL("/auth/refresh", env.NEXT_PUBLIC_API_URL).toString(), spy);
  return { handler, spy };
}
