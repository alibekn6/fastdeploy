import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/shared/config/auth";
import { routing } from "@/shared/i18n";
import { checkRouteAccess } from "@/shared/lib/route-guard";

const handleI18nRouting = createMiddleware(routing);

/**
 * Compose the next-intl locale middleware with the auth route-guard so each
 * request gets a single final resolution (at most one auth redirect, no loops).
 *
 * i18n-FIRST: next-intl resolves the locale (and owns locale-prefix redirects);
 * we then derive the delocalized canonical path and thread the resolved locale
 * back into every auth redirect — so a `ru` user bounced off /ru/dashboard
 * lands on /ru/login, not /login. The guard runs in ALL modes (mock cookies are
 * decodable JWTs — no mock-mode bypass).
 */
export function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);

  // next-intl already issued the single final redirect (bare `/` → locale,
  // invalid-prefix normalization) — never layer auth onto an unresolved path.
  if (!response.ok) return response;

  // Canonical path: next-intl's rewrite header carries the locale-prefixed
  // pathname (fall back to the request URL). Clamp the leading segment against
  // `routing.locales` — an unknown segment resolves to the default locale, so a
  // raw value is never echoed into a redirect target (no open redirect).
  const [, maybeLocale, ...rest] = new URL(
    response.headers.get("x-middleware-rewrite") ?? request.url,
  ).pathname.split("/");
  const locale = hasLocale(maybeLocale) ? maybeLocale : routing.defaultLocale;
  const canonicalPath = `/${rest.join("/")}`;

  const accessToken = request.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  // Pure, network-free decision on raw cookie strings — the guard does its own
  // (unverified) decoding; the API is the real security boundary.
  const decision = checkRouteAccess(canonicalPath, accessToken, refreshToken);

  if (decision === "allow") return response;
  return localeRedirect(request, locale, decision, response);
}

function hasLocale(value: string | undefined): value is (typeof routing.locales)[number] {
  return routing.locales.includes(value as (typeof routing.locales)[number]);
}

/**
 * Exactly one locale-prefixed redirect (`/{locale}/{login|dashboard}` — no
 * query/fragment carryover), preserving next-intl's headers and cookies except
 * the rewrite (it would override the redirect) and duplicate location/cookie
 * headers, so the resolved locale survives the bounce.
 */
function localeRedirect(
  request: NextRequest,
  locale: string,
  decision: "login" | "dashboard",
  intlResponse: NextResponse,
) {
  const redirect = NextResponse.redirect(new URL(`/${locale}/${decision}`, request.url));
  intlResponse.headers.forEach((value, key) => {
    if (key === "x-middleware-rewrite" || key === "location" || key === "set-cookie") return;
    redirect.headers.set(key, value);
  });
  for (const cookie of intlResponse.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

// Site-wide matcher; excludes `ingest` so the PostHog reverse-proxy route
// handler (app/ingest/[...path]/route.ts) isn't locale-prefixed by the i18n
// middleware (which would 404 the capture endpoints).
export const config = { matcher: "/((?!api|ingest|_next|_vercel|.*\\..*).*)" };
