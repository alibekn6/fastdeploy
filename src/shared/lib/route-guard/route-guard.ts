/**
 * Pure, network-free route-access decisions from raw cookie strings. The JWT
 * payload is base64url-decoded WITHOUT signature verification — this is a cheap
 * UX gate; the API is the security boundary (a forged cookie gets a page shell,
 * never data). Both exports are total functions: any input returns a value,
 * never throws.
 */

/** Public paths that never require authentication (prefix-matched). */
const PUBLIC_PATHS = ["/", "/examples/ssr", "/examples/websocket"];

/** Auth pages a user with a LIVE access token is bounced away from. */
const AUTH_PATHS = ["/login", "/signup"];

/** Tolerated client/server clock skew (grace past `exp`, future-`iat` slack). */
const CLOCK_SKEW_MS = 30_000;

type RouteDecision = "allow" | "login" | "dashboard";

interface AccessClaims {
  exp?: unknown;
  iat?: unknown;
}

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Decode a JWT payload without verifying it. Null on anything undecodable. */
function decodeJwtPayload(token: string): AccessClaims | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
    const parsed: unknown = JSON.parse(atob(padded));
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as AccessClaims;
  } catch {
    return null;
  }
}

/**
 * An access token is live iff it decodes, `exp` is numeric and inside the 30s
 * grace window, and `iat` (when numeric) is not more than 30s in the future
 * (defense-in-depth: such a token is treated as malformed).
 */
function isLive(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  const claims = decodeJwtPayload(accessToken);
  if (!claims) return false;
  if (typeof claims.exp !== "number") return false;
  if (typeof claims.iat === "number" && claims.iat * 1000 > Date.now() + CLOCK_SKEW_MS) {
    return false;
  }
  return claims.exp * 1000 + CLOCK_SKEW_MS > Date.now();
}

/**
 * Whether the cookies represent a session: a live access token OR a refresh
 * token (which can mint a new one). Refresh-token liveness is deliberately not
 * checked — it is opaque to the client; revocation is detected lazily by the
 * API 401ing.
 */
export function hasSession(
  accessToken: string | undefined,
  refreshToken: string | undefined,
): boolean {
  return isLive(accessToken) || Boolean(refreshToken);
}

/**
 * Three-valued route decision for a delocalized pathname.
 *
 * Auth pages bounce to `dashboard` ONLY on a live access token — never on a
 * bare refresh cookie (which may be revoked server-side and, being httpOnly,
 * cannot be deleted by the client; bouncing on presence would trap that user in
 * a login/dashboard redirect loop). Public paths always allow. Everything else
 * requires a session.
 */
export function checkRouteAccess(
  pathname: string,
  accessToken: string | undefined,
  refreshToken: string | undefined,
): RouteDecision {
  const live = isLive(accessToken);
  if (matches(pathname, AUTH_PATHS)) return live ? "dashboard" : "allow";
  if (matches(pathname, PUBLIC_PATHS)) return "allow";
  return live || refreshToken ? "allow" : "login";
}
