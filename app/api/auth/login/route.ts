import { setAccessCookie, setRefreshCookie } from "@server/auth/cookies";
import { REFRESH_TTL_SECONDS, signAccessToken, signRefreshToken } from "@server/auth/jwt";
import { TIMING_EQUALIZATION_HASH, verifyPassword } from "@server/auth/password";
import { clearAttempts, isRateLimited, LOGIN_LIMIT, recordAttempt } from "@server/auth/rate-limit";
import { getDb } from "@server/db";
import { refreshTokens, users } from "@server/db/schema";
import { authError, clientIp, envelope, serverFailure } from "@server/http";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

const BodySchema = z.object({ email: z.email(), password: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return authError(400, "invalid_request", "Email and password are required");
    }
    const email = parsed.data.email.trim().toLowerCase();
    const keys = [`login:email:${email}`, `login:ip:${clientIp(request)}`];

    for (const key of keys) {
      if (await isRateLimited(key, LOGIN_LIMIT)) {
        return authError(429, "too_many_attempts", "Too many attempts. Try again later.");
      }
    }

    const db = getDb();
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    // Unknown email still burns one argon2 verification so response timing
    // can't enumerate accounts.
    const passwordOk = await verifyPassword(
      user?.passwordHash ?? TIMING_EQUALIZATION_HASH,
      parsed.data.password,
    );
    if (!user || !user.isActive || !passwordOk) {
      await Promise.all(keys.map(recordAttempt));
      return authError(401, "invalid_credentials", "Invalid email or password");
    }
    await clearAttempts(keys[0] as string);

    const jti = crypto.randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ id: user.id, email: user.email }),
      signRefreshToken({ id: user.id, email: user.email }, jti),
    ]);
    await db.insert(refreshTokens).values({
      jti,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
    });

    // Production bodies never carry token values — cookies only (spec §2.1).
    const response = envelope({ message: "Signed in" });
    setAccessCookie(response, accessToken);
    setRefreshCookie(response, refreshToken);
    return response;
  } catch (error) {
    return serverFailure(error);
  }
}
