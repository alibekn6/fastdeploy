import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/shared/config/auth";
import { type VerifiedClaims, verifyToken } from "./auth/jwt";
import { ServerConfigError } from "./config";

/** Auth-block `{data}` envelope (spec §2.4). Non-auth endpoints stay flat. */
export function envelope(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function authError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Uniform 500 mapping: config gaps get a stable code, nothing leaks a stack. */
export function serverFailure(error: unknown): NextResponse {
  if (error instanceof ServerConfigError) {
    return authError(500, "server_misconfigured", error.message);
  }
  console.error("[api] unhandled error", error);
  return authError(500, "internal_error", "Something went wrong");
}

/** Verified identity from the access-token cookie, or null. */
export function authenticate(request: NextRequest): Promise<VerifiedClaims | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? verifyToken(token) : Promise.resolve(null);
}

export function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
