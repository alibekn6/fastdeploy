// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/shared/config/auth";
import { config, proxy } from "./proxy";

const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const mintJwt = (payload: object) =>
  `${b64url({ alg: "none", typ: "JWT" })}.${b64url(payload)}.mock`;

const now = Math.floor(Date.now() / 1000);
const liveAccess = mintJwt({ sub: "u1", email: "user@example.com", exp: now + 900, iat: now });

function request(path: string, cookies: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("proxy — locale-preserved auth redirects", () => {
  it("redirects anonymous /ru/dashboard to /ru/login", () => {
    const response = proxy(request("/ru/dashboard"));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/ru/login");
  });

  it("redirects anonymous unprefixed /dashboard to the default-locale login", () => {
    const response = proxy(request("/dashboard"));
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/en/login");
  });

  it("bounces a live access token off /ru/login to /ru/dashboard", () => {
    const response = proxy(request("/ru/login", { [SESSION_COOKIE]: liveAccess }));
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/ru/dashboard");
  });

  it("lets a refresh-token-only visitor stay on /login (no bounce)", () => {
    const response = proxy(request("/login", { [REFRESH_COOKIE]: "opaque-refresh" }));
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows anonymous public paths in any locale", () => {
    for (const path of ["/", "/kk", "/ru/examples/ssr/1", "/examples/websocket"]) {
      expect(proxy(request(path)).headers.get("location")).toBeNull();
    }
  });

  it("allows /ru/dashboard on a refresh token alone (lazy revocation detection)", () => {
    const response = proxy(request("/ru/dashboard", { [REFRESH_COOKIE]: "opaque-refresh" }));
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("proxy config.matcher", () => {
  it("stays site-wide but excludes /ingest (PostHog reverse-proxy)", () => {
    const pattern = new RegExp(`^${config.matcher}$`);
    expect(pattern.test("/ingest/e")).toBe(false);
    expect(pattern.test("/ingest/decide/")).toBe(false);
    expect(pattern.test("/ru/dashboard")).toBe(true);
    expect(pattern.test("/login")).toBe(true);
  });
});
