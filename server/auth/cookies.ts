import type { NextResponse } from "next/server";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/shared/config/auth";
import { env } from "@/shared/config/env";
import { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS } from "./jwt";

// The contract's cookie posture: httpOnly + SameSite=Lax + Path=/ (Lax is the
// CSRF stance — state changes stay non-GET). `secure` is release-gated so
// local `next dev` over plain http still receives the cookies in every browser.
const base = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: env.NODE_ENV === "production",
} as const;

export function setAccessCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, { ...base, maxAge: ACCESS_TTL_SECONDS });
}

export function setRefreshCookie(response: NextResponse, token: string): void {
  response.cookies.set(REFRESH_COOKIE, token, { ...base, maxAge: REFRESH_TTL_SECONDS });
}

/** Unconditional dual clear — the F5 revoked-session escape hatch (spec §2.6). */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { ...base, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...base, maxAge: 0 });
}
