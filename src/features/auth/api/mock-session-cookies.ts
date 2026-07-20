import { REFRESH_COOKIE, SESSION_COOKIE } from "@/shared/config/auth";
import { env } from "@/shared/config/env";
import { decodeJwtPayload } from "@/shared/lib/route-guard";

/** Fallback lifetimes (seconds) if a mock token's `exp` is unreadable. */
const ACCESS_FALLBACK_SECONDS = 900;
const REFRESH_FALLBACK_SECONDS = 60 * 60 * 24 * 30;

/** Max-Age matching the token's own lifetime, read from its `exp` claim. */
function maxAgeFrom(token: string, fallbackSeconds: number): number {
  const exp = decodeJwtPayload(token)?.exp;
  if (typeof exp !== "number") return fallbackSeconds;
  const seconds = Math.floor(exp - Date.now() / 1000);
  return seconds > 0 ? seconds : fallbackSeconds;
}

/**
 * Mock mode ONLY (`NEXT_PUBLIC_API_MOCKING=enabled`): a Service Worker cannot
 * set httpOnly cookies, so the client writes readable equivalents of both
 * tokens for `proxy.ts` to gate on. In production the backend sets Secure
 * httpOnly cookies via Set-Cookie and this function is a no-op.
 */
export function writeMockSessionCookies(tokens: {
  access_token: string;
  refresh_token?: string;
}): void {
  if (env.NEXT_PUBLIC_API_MOCKING !== "enabled") return;
  const attrs = "Path=/; SameSite=Lax";
  document.cookie = `${SESSION_COOKIE}=${tokens.access_token}; ${attrs}; Max-Age=${maxAgeFrom(tokens.access_token, ACCESS_FALLBACK_SECONDS)}`;
  if (tokens.refresh_token) {
    document.cookie = `${REFRESH_COOKIE}=${tokens.refresh_token}; ${attrs}; Max-Age=${maxAgeFrom(tokens.refresh_token, REFRESH_FALLBACK_SECONDS)}`;
  }
}

/**
 * Mock mode ONLY: expire BOTH readable token cookies (sign-out). In production
 * the backend's `auth/logout` deletes the httpOnly cookies and this is a no-op.
 */
export function clearMockSessionCookies(): void {
  if (env.NEXT_PUBLIC_API_MOCKING !== "enabled") return;
  const attrs = "Path=/; SameSite=Lax; Max-Age=0";
  document.cookie = `${SESSION_COOKIE}=; ${attrs}`;
  document.cookie = `${REFRESH_COOKIE}=; ${attrs}`;
}
