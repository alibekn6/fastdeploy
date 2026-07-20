import { queryOptions, useQuery } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { z } from "zod";
import type { User } from "@/entities/user/@x/session";
import { getValidated } from "@/shared/api/fetcher";
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

/**
 * `GET auth/me` → `Session`. A 401 resolves to `anonymousSession` — being
 * signed out is a state, not an error. Any other failure follows normal
 * query-error semantics (and never clears cookies).
 */
export async function fetchSession(): Promise<Session> {
  try {
    return makeSession(unwrap(await getValidated("auth/me", MeEnvelopeSchema)));
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 401) return anonymousSession;
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
