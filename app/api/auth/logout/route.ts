import { clearAuthCookies } from "@server/auth/cookies";
import { verifyToken } from "@server/auth/jwt";
import { getDb } from "@server/db";
import { refreshTokens } from "@server/db/schema";
import { envelope } from "@server/http";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/shared/config/auth";

/**
 * Break-glass semantics (spec §2.4/§2.6): ANY cookie state gets a 200 and both
 * httpOnly cookies cleared — only the backend can delete them, and a revoked
 * session must always have an exit. Ledger revocation is best-effort.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(REFRESH_COOKIE)?.value;
  if (token) {
    try {
      const claims = await verifyToken(token);
      if (claims?.jti) {
        await getDb()
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokens.jti, claims.jti));
      }
    } catch {
      // Logout must never fail: cookie clearing below is the contract.
    }
  }
  const response = envelope({ message: "Signed out" });
  clearAuthCookies(response);
  return response;
}
