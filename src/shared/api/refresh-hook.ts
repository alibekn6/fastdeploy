import type { AfterResponseHook } from "ky";
import { z } from "zod";
import { env } from "@/shared/config/env";
import { routes } from "@/shared/config/routes";
import { routing } from "@/shared/i18n/routing";
import type { RefreshedMockTokens } from "./refreshed-tokens";

/**
 * Endpoints excluded from the 401→refresh path. The four token-lifecycle
 * routes must never recurse into another refresh; `auth/me` is excluded too
 * because its 401 is a session probe ("signed out" is a state, mapped to
 * `anonymousSession`) — refreshing on it would bounce anonymous visitors off
 * public pages and re-trigger on the post-escape login page (breaking the
 * A8 exactly-one-redirect contract).
 */
const AUTH_PATH_SEGMENTS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/me",
];

/** True for routes that must NOT trigger a transparent refresh (auth routes). */
export function isAuthUrl(url: string): boolean {
  return AUTH_PATH_SEGMENTS.some((segment) => url.includes(segment));
}

/**
 * Single module-scoped in-flight refresh: the first 401 creates it, concurrent
 * 401s await the same promise, and it resets to `null` in `finally` — the
 * backend sees exactly one `auth/refresh` per expiry burst. SSR-safe: the
 * promise holds no request-specific state (cookies ride each request), so the
 * worst case for concurrent server-side 401s is sharing one refresh call.
 */
let refreshPromise: Promise<void> | null = null;

/**
 * Mock-mode-only refresh envelope. Production bodies never carry tokens, so an
 * absent `mock_tokens` is the normal shape — not an error.
 */
const RefreshEnvelopeSchema = z.object({
  data: z.object({
    mock_tokens: z.object({ access_token: z.string(), refresh_token: z.string().optional() }),
  }),
});

/**
 * Best-effort read + hand-off of the refreshed mock tokens. NEVER throws — the
 * READ and the SINK CALL are both inside the guard, because this runs in the
 * shared refresh promise chain where any rejection would be misread as a failed
 * refresh and trigger a spurious logout + redirect on a SUCCESSFUL refresh.
 * `clone()` keeps the original body intact for the caller's `.ok` check.
 */
async function deliverMockTokens(
  response: Response,
  onTokens: (tokens: RefreshedMockTokens) => void,
): Promise<void> {
  try {
    const parsed = RefreshEnvelopeSchema.safeParse(await response.clone().json());
    if (parsed.success) onTokens(parsed.data.data.mock_tokens);
  } catch {
    // Mock-mode-only side effect: a failure here must never fail the refresh.
  }
}

/**
 * Factory: a ky `afterResponse` hook implementing transparent session refresh
 * (spec §2.6). On a 401 from a non-auth route: refresh once (deduped), then
 * retry the original request ONCE via raw `fetch(request.clone())` — the
 * retried Response is returned to ky as the final response (`throwHttpErrors`
 * runs after the hooks, so callers parse the retried body), and raw fetch
 * bypasses this hook, so a still-401 retry cannot recurse. The refresh
 * response body (auth `{data}` envelope) is never parsed — only `response.ok`
 * decides. Transparent refresh invalidates NO query keys: the user is
 * unchanged, so preserving the cache is correct.
 */
export function createRefreshHook(
  onAuthFailure: () => void,
  onTokens?: (tokens: RefreshedMockTokens) => void,
): AfterResponseHook {
  return async ({ request, response }) => {
    if (response.status !== 401 || isAuthUrl(request.url)) return undefined;

    if (!refreshPromise) {
      refreshPromise = fetch(new URL("auth/refresh", env.NEXT_PUBLIC_API_URL), {
        method: "POST",
        credentials: "include",
      })
        .then(async (refreshResponse) => {
          if (!refreshResponse.ok) throw new Error("refresh_failed");
          // Mock mode only: persist the rotated access token so the NEXT 401
          // burst refreshes against the fresh cookie instead of the stale one.
          if (onTokens) await deliverMockTokens(refreshResponse, onTokens);
        })
        .catch((error: unknown) => {
          // Escape EXACTLY ONCE per failure burst — inside the shared promise
          // chain, not per awaiting caller, so N concurrent 401s produce one
          // logout and one redirect (the A8 redirect-loop measure). A failed
          // refresh (e.g. server-side revocation) can leave an UNEXPIRED
          // access cookie behind: the route guard decodes it as live and would
          // bounce /login straight back to /dashboard forever. Only the
          // backend can delete the httpOnly cookies — `auth/logout` clears
          // them unconditionally (no auth check, spec §2.4), breaking that
          // loop. It is fire-and-forget: per contract it always returns 200,
          // so the swallowed failures are transport-level only, and the
          // redirect never waits on or depends on the logout outcome.
          fetch(new URL("auth/logout", env.NEXT_PUBLIC_API_URL), {
            method: "POST",
            credentials: "include",
          }).catch(() => {});
          onAuthFailure();
          throw error;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      await refreshPromise;
      return await fetch(request.clone());
    } catch {
      // Refresh failed: the shared chain above already performed the one
      // logout + redirect for this burst; every caller just keeps its 401.
      return undefined;
    }
  };
}

/** Locale-preserving login path: `/ru/dashboard` → `/ru/login`, `en` unprefixed. */
export function localizedLoginPath(pathname: string): string {
  const [, first] = pathname.split("/");
  const locale = routing.locales.find((candidate) => candidate === first);
  if (!locale || locale === routing.defaultLocale) return routes.login;
  return `/${locale}${routes.login}`;
}

/**
 * Default auth-failure handler: full client-side navigation to the localized
 * login route (a full load lets `proxy.ts` re-evaluate the cookies). No-op in
 * non-browser contexts — on the server the caller's HTTPError surfaces to the
 * route's error boundary instead.
 */
export function redirectToLogin(
  location: Pick<Location, "pathname" | "assign"> | undefined = typeof window === "undefined"
    ? undefined
    : window.location,
): void {
  if (!location) return;
  location.assign(localizedLoginPath(location.pathname));
}
