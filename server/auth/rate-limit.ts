import { and, count, eq, gt } from "drizzle-orm";
import { getDb } from "../db";
import { authAttempts } from "../db/schema";

export type RateLimit = { max: number; windowMs: number };

/** Failed sign-ins per email and per IP. */
export const LOGIN_LIMIT: RateLimit = { max: 10, windowMs: 15 * 60_000 };
/** Registrations per IP. */
export const REGISTER_LIMIT: RateLimit = { max: 20, windowMs: 60 * 60_000 };

/**
 * DB-backed sliding window: works across serverless instances without extra
 * infrastructure. Swap for Upstash Redis if attempt volume ever matters.
 */
export async function isRateLimited(key: string, limit: RateLimit): Promise<boolean> {
  const since = new Date(Date.now() - limit.windowMs);
  const [row] = await getDb()
    .select({ n: count() })
    .from(authAttempts)
    .where(and(eq(authAttempts.key, key), gt(authAttempts.at, since)));
  return (row?.n ?? 0) >= limit.max;
}

export async function recordAttempt(key: string): Promise<void> {
  await getDb().insert(authAttempts).values({ key });
}

/** Reset on success so a legitimate user isn't locked out by old failures. */
export async function clearAttempts(key: string): Promise<void> {
  await getDb().delete(authAttempts).where(eq(authAttempts.key, key));
}
