import { HttpResponse, http } from "msw";
import { env } from "@/shared/config/env";

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

/** Mock access-token lifetime (seconds); the refresh path arrives in bead .2. */
const ACCESS_TTL_SECONDS = 900;

export const handlers = [
  http.get(api("/users/:id"), ({ params }) =>
    HttpResponse.json({ id: params.id, name: "Ada Lovelace" }),
  ),
  http.get(api("/posts"), () => HttpResponse.json([{ id: "1", title: "First", body: "Hello" }])),
  http.post(api("/auth/login"), async ({ request }) => {
    const body = (await request.json()) as { email: string };
    return HttpResponse.json({
      token: mintMockJwt({ sub: "u1", email: body.email, ttlSeconds: ACCESS_TTL_SECONDS }),
      user: { id: "u1", name: body.email },
    });
  }),
  http.post(api("/auth/logout"), () => HttpResponse.json({ ok: true })),
];
