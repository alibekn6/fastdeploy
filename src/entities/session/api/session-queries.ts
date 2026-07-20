import { queryOptions, useQuery } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { z } from "zod";
import type { User } from "@/entities/user/@x/session";
import { getValidated } from "@/shared/api/fetcher";
import { refreshSessionQuietly } from "@/shared/api/refresh-hook";
import { unwrap } from "@/shared/api/unwrap";
import { anonymousSession, makeSession, type Session } from "../model/session";

// Runtime validation stays local — the `@x` protocol shares types only. The
// `satisfies` pin keeps this schema compile-checked against the user contract.
const MeUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  is_active: z.boolean(),
}) satisfies z.ZodType<User>;

const MeEnvelopeSchema = z.object({ data: MeUserSchema });

const isUnauthorized = (error: unknown): boolean =>
  error instanceof HTTPError && error.response.status === 401;

const readMe = async (): Promise<Session> =>
  makeSession(unwrap(await getValidated("auth/me", MeEnvelopeSchema)));

/**
 * `GET auth/me` → `Session`. A 401 resolves to `anonymousSession` — being
 * signed out is a state, not an error. Any other failure follows normal
 * query-error semantics (and never clears cookies).
 *
 * A 401 is ambiguous: it means EITHER "genuinely anonymous" OR "the 15-minute
 * access token expired while the 30-day refresh token is still live". The
 * client cannot tell them apart by reading cookies (they are httpOnly in
 * production), so it disambiguates by attempting — once, quietly — to refresh.
 * `auth/me` stays excluded from the ky refresh hook, which owns session escape
 * (logout + redirect); this path only ever downgrades to `anonymousSession`.
 * Strictly bounded: one refresh, one re-read, never a third call, no recursion.
 */
export async function fetchSession(): Promise<Session> {
  try {
    return await readMe();
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
  }

  if (!(await refreshSessionQuietly())) return anonymousSession;

  try {
    return await readMe();
  } catch (error) {
    if (isUnauthorized(error)) return anonymousSession;
    throw error;
  }
}

export const sessionKeys = { current: ["session"] as const };

export const sessionQueries = {
  current: () => queryOptions({ queryKey: sessionKeys.current, queryFn: fetchSession }),
};

/** Session state lives ONLY in the TanStack Query cache — no store, no localStorage. */
export function useSession() {
  return useQuery(sessionQueries.current());
}
