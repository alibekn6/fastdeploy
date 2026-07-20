import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { type Session, sessionQueries } from "@/entities/session";
import { identifyUser } from "@/shared/analytics";
import { http } from "@/shared/api/http";
import { unwrap } from "@/shared/api/unwrap";
import type { SignInInput } from "../model/schema";
import { writeMockSessionCookies } from "./mock-session-cookies";

const LoginEnvelopeSchema = z.object({
  data: z.object({
    message: z.string(),
    // Mock mode only: bodies carry the minted tokens so the client can write
    // readable cookies (§2.1). Production bodies never include them.
    mock_tokens: z.object({ access_token: z.string(), refresh_token: z.string() }).optional(),
  }),
});

/**
 * Sign-in flow: `auth/login` (backend sets both httpOnly cookies) → `auth/me`
 * via the session query, which both performs the call and primes the
 * `["session"]` cache — the only place session state lives.
 */
export async function signIn(input: SignInInput, queryClient: QueryClient): Promise<Session> {
  const json = await http.post("auth/login", { json: input }).json<unknown>();
  const { mock_tokens } = unwrap(LoginEnvelopeSchema.parse(json));
  if (mock_tokens) writeMockSessionCookies(mock_tokens);
  const session = await queryClient.fetchQuery(sessionQueries.current());
  // Boilerplate analytics: identify by the stable backend user id.
  if (session.user) identifyUser(session.user.id, { email: session.user.email });
  return session;
}
