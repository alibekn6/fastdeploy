import { setAccessCookie } from "@server/auth/cookies";
import { signAccessToken, verifyToken } from "@server/auth/jwt";
import { getDb } from "@server/db";
import { refreshTokens, users } from "@server/db/schema";
import { authError, envelope, serverFailure } from "@server/http";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/shared/config/auth";

/**
 * No rotation (spec): the refresh token is never reissued. Verification is
 * full — signature, expiry, and the DB ledger (revocation + user liveness).
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(REFRESH_COOKIE)?.value;
    if (!token) return authError(401, "invalid_refresh", "Refresh token missing");

    const claims = await verifyToken(token);
    if (!claims?.jti) return authError(401, "invalid_refresh", "Refresh token invalid");

    const db = getDb();
    const ledger = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.jti, claims.jti),
    });
    if (!ledger || ledger.revokedAt !== null || ledger.expiresAt <= new Date()) {
      return authError(401, "invalid_refresh", "Refresh token revoked");
    }
    const user = await db.query.users.findFirst({ where: eq(users.id, claims.sub) });
    if (!user?.isActive) return authError(401, "invalid_refresh", "Account is not active");

    const response = envelope({ message: "Refreshed" });
    setAccessCookie(response, await signAccessToken({ id: user.id, email: user.email }));
    return response;
  } catch (error) {
    return serverFailure(error);
  }
}
