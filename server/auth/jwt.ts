import { jwtVerify, SignJWT } from "jose";
import { requireJwtSecret } from "../config";

/** Token lifetimes (seconds) — identical to the mock contract (spec §2.1). */
export const ACCESS_TTL_SECONDS = 900;
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;

const ALG = "HS256";
const secretKey = () => new TextEncoder().encode(requireJwtSecret());

export type TokenUser = { id: string; email: string };

export async function signAccessToken(user: TokenUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: ALG, typ: "JWT" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS)
    .sign(secretKey());
}

/** Refresh tokens carry a `jti` so revocation can target the DB ledger row. */
export async function signRefreshToken(user: TokenUser, jti: string): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: ALG, typ: "JWT" })
    .setSubject(user.id)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + REFRESH_TTL_SECONDS)
    .sign(secretKey());
}

export type VerifiedClaims = { sub: string; email: string; jti?: string };

/**
 * Full verification — signature, algorithm pin, and expiry. This is the real
 * security boundary; the middleware route guard's unverified decode is UX
 * only. Returns `null` on any failure (never throws on bad input).
 */
export async function verifyToken(token: string): Promise<VerifiedClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [ALG] });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      jti: typeof payload.jti === "string" ? payload.jti : undefined,
    };
  } catch {
    return null;
  }
}
