import { HttpResponse, http } from "msw";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/shared/config/auth";
import { env } from "@/shared/config/env";
import { decodeJwtPayload } from "@/shared/lib/route-guard";

const api = (path: string) => new URL(path, env.NEXT_PUBLIC_API_URL).toString();

const base64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * Mint an unsigned-but-decodable mock JWT (pinned format:
 * `base64url({"alg":"none","typ":"JWT"}) . base64url({sub,email,exp,iat}) . "mock"`)
 * so the route guard decodes real `exp`/`iat` claims and runs identically in
 * mock mode — no mock-mode guard bypass.
 */
export function mintMockJwt({
  sub,
  email,
  ttlSeconds,
}: {
  sub: string;
  email: string;
  ttlSeconds: number;
}): string {
  const iat = Math.floor(Date.now() / 1000);
  return `${base64url({ alg: "none", typ: "JWT" })}.${base64url({ sub, email, exp: iat + ttlSeconds, iat })}.mock`;
}

/** Mock token lifetimes (seconds): short access window, 30-day refresh (spec §2.1). */
const ACCESS_TTL_SECONDS = 900;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;

// Auth-block-only response contract (spec §2.4): `{data: T}` envelope on 2xx,
// `{error: {code, message}}` on 4xx/5xx. Non-auth endpoints stay flat.
const envelope = (data: unknown) => HttpResponse.json({ data });
const authError = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message } }, { status });

/**
 * Identity claims a stateless mock derives from a minted token; fallbacks keep
 * the handlers total even for opaque/hand-planted cookie values.
 */
function identityFrom(token: string): { sub: string; email: string } {
  const claims = decodeJwtPayload(token);
  return {
    sub: typeof claims?.sub === "string" ? claims.sub : "u1",
    email: typeof claims?.email === "string" ? claims.email : "user@example.com",
  };
}

// Error variants (401/429/5xx…) are produced ONLY via per-test/per-story
// overrides — the happy-path handlers below stay stateless and reentrant.
export const handlers = [
  http.get(api("/users/:id"), ({ params }) =>
    HttpResponse.json({ id: params.id, email: "ada@example.com", name: "ada", is_active: true }),
  ),
  http.get(api("/posts"), () => HttpResponse.json([{ id: "1", title: "First", body: "Hello" }])),
  http.post(api("/auth/login"), async ({ request }) => {
    const { email } = (await request.json()) as { email: string };
    // Mock bodies alone carry token values (a Service Worker cannot set
    // httpOnly cookies); production bodies never do — cookies only.
    return envelope({
      message: "Signed in",
      mock_tokens: {
        access_token: mintMockJwt({ sub: "u1", email, ttlSeconds: ACCESS_TTL_SECONDS }),
        refresh_token: mintMockJwt({ sub: "u1", email, ttlSeconds: REFRESH_TTL_SECONDS }),
      },
    });
  }),
  // Validates ONLY the refresh_token cookie (presence — it is opaque to the
  // client); the access_token is not validated at all. No refresh rotation.
  http.post(api("/auth/refresh"), ({ cookies }) => {
    const refreshToken = cookies[REFRESH_COOKIE];
    if (!refreshToken) return authError(401, "invalid_refresh", "Refresh token missing");
    const { sub, email } = identityFrom(refreshToken);
    return envelope({
      message: "Refreshed",
      mock_tokens: { access_token: mintMockJwt({ sub, email, ttlSeconds: ACCESS_TTL_SECONDS }) },
    });
  }),
  // No auth check at all — any cookie state gets 200 (break-glass for stale sessions).
  http.post(api("/auth/logout"), () => envelope({ message: "Signed out" })),
  http.get(api("/auth/me"), ({ cookies }) => {
    const accessToken = cookies[SESSION_COOKIE];
    const claims = accessToken ? decodeJwtPayload(accessToken) : null;
    const email = typeof claims?.email === "string" ? claims.email : null;
    const exp = typeof claims?.exp === "number" ? claims.exp : 0;
    if (!email || exp * 1000 <= Date.now()) {
      return authError(401, "unauthorized", "Not authenticated");
    }
    return envelope({
      id: typeof claims?.sub === "string" ? claims.sub : "u1",
      email,
      // The backend sets the display name; the mock uses the email local-part, lowercased.
      name: email.split("@")[0]?.toLowerCase() ?? null,
      is_active: true,
    });
  }),
];
