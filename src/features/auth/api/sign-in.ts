import { identifyUser } from "@/shared/analytics";
import { http } from "@/shared/api/http";
import { SESSION_COOKIE } from "@/shared/config/auth";
import { env } from "@/shared/config/env";
import { type SignInInput, signInSchema } from "../model/schema";

export async function signIn(input: SignInInput) {
  const parsed = signInSchema.parse(input);
  const { token } = await http.post("auth/login", { json: parsed }).json<{ token: string }>();
  // The real backend sets a Secure, httpOnly `session` cookie via Set-Cookie.
  // In mock mode there is no backend and a Service Worker cannot set httpOnly
  // cookies, so set a readable one client-side so `proxy.ts` can gate routes.
  if (env.NEXT_PUBLIC_API_MOCKING === "enabled") {
    document.cookie = `${SESSION_COOKIE}=${token}; path=/; SameSite=Lax`;
  }
  // Boilerplate: the mock backend only returns a token. In production pass the
  // stable backend user id (e.g. from a /me endpoint) as the distinct id.
  identifyUser(token);
}
