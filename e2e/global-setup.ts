import type { FullConfig } from "@playwright/test";

// No pre-seeding needed: the MSW-mocked login accepts any credentials.
//
// The dev server (`pnpm dev:mock`) compiles routes on FIRST request, and a
// cold compile of several routes under fully-parallel workers can exceed the
// per-test timeout (observed as `getByLabel` 30 s timeouts on a loaded
// machine). Warming each route here moves that one-time compile cost out of
// the tests.

const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** Unsigned mock JWT (spec §2.1 pinned format) so the proxy admits /dashboard. */
function mintWarmupJwt(): string {
  const iat = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url({
    sub: "warmup",
    email: "warmup@example.com",
    exp: iat + 300,
    iat,
  })}.mock`;
}

const WARM_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/dashboard",
  "/examples/ssr/1",
  "/examples/websocket",
  "/ru/login",
  "/ru/dashboard",
];

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) return;
  const cookie = `access_token=${mintWarmupJwt()}`;
  const deadline = Date.now() + 90_000;
  for (const route of WARM_ROUTES) {
    while (Date.now() < deadline) {
      try {
        await fetch(new URL(route, baseURL), { headers: { cookie } });
        break;
      } catch {
        // Server not accepting connections yet — retry until the deadline.
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
  }
}
