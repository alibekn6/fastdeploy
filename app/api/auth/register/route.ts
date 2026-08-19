import { setAccessCookie, setRefreshCookie } from "@server/auth/cookies";
import { REFRESH_TTL_SECONDS, signAccessToken, signRefreshToken } from "@server/auth/jwt";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@server/auth/password";
import { isRateLimited, REGISTER_LIMIT, recordAttempt } from "@server/auth/rate-limit";
import { getDb } from "@server/db";
import { refreshTokens, users } from "@server/db/schema";
import { authError, clientIp, envelope, serverFailure } from "@server/http";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  email: z.email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return authError(
        400,
        "invalid_request",
        `A valid email and a password of at least ${MIN_PASSWORD_LENGTH} characters are required`,
      );
    }
    const ipKey = `register:ip:${clientIp(request)}`;
    if (await isRateLimited(ipKey, REGISTER_LIMIT)) {
      return authError(429, "too_many_attempts", "Too many attempts. Try again later.");
    }
    await recordAttempt(ipKey);

    const email = parsed.data.email.trim().toLowerCase();
    const db = getDb();
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) {
      // Documented enumeration tradeoff (spec): a distinct 409 beats a
      // generic error for signup UX.
      return authError(409, "email_taken", "Email already registered");
    }

    const passwordHash = await hashPassword(parsed.data.password);
    // The backend derives the display name from the email local-part (spec).
    const name = email.split("@")[0]?.toLowerCase() ?? null;
    const [user] = await db.insert(users).values({ email, passwordHash, name }).returning();
    if (!user) return authError(500, "internal_error", "Could not create the account");

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

    const response = envelope({ message: "Registered" });
    setAccessCookie(response, accessToken);
    setRefreshCookie(response, refreshToken);
    return response;
  } catch (error) {
    return serverFailure(error);
  }
}
