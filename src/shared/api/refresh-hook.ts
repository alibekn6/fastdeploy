import type { AfterResponseHook } from "ky";
import { env } from "@/shared/config/env";
import { routes } from "@/shared/config/routes";
import { routing } from "@/shared/i18n/routing";

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
export function createRefreshHook(onAuthFailure: () => void): AfterResponseHook {
  return async ({ request, response }) => {
    if (response.status !== 401 || isAuthUrl(request.url)) return undefined;

    if (!refreshPromise) {
      refreshPromise = fetch(new URL("auth/refresh", env.NEXT_PUBLIC_API_URL), {
        method: "POST",
        credentials: "include",
      })
        .then((refreshResponse) => {
          if (!refreshResponse.ok) throw new Error("refresh_failed");
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      await refreshPromise;
      return await fetch(request.clone());
    } catch {
      // A failed refresh (e.g. server-side revocation) can leave an UNEXPIRED
      // access cookie behind: the route guard decodes it as live and would
      // bounce /login straight back to /dashboard forever. Only the backend
      // can delete the httpOnly cookies — `auth/logout` clears them
      // unconditionally (no auth check, spec §2.4), breaking that loop. It is
      // fire-and-forget: per contract it always returns 200, so the swallowed
      // failures are transport-level only, and the redirect below never waits
      // on or depends on the logout outcome.
      fetch(new URL("auth/logout", env.NEXT_PUBLIC_API_URL), {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
      onAuthFailure();
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
