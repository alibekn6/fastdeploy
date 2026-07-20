import { HttpResponse, http as mswHttp } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http } from "@/shared/api/http";
import { handlers, mintMockJwt } from "@/shared/api/mocks/handlers";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/shared/config/auth";
import { env } from "@/shared/config/env";
import { decodeJwtPayload } from "@/shared/lib/route-guard";
import { anonymousSession } from "../model/session";
import { fetchSession } from "./session-queries";

const api = (path: string) => new URL(path, env.NEXT_PUBLIC_API_URL).toString();

// The real shared handlers at the network boundary: `auth/me` genuinely decodes
// the access-token cookie and `auth/refresh` genuinely requires the refresh
// cookie, so the stale-vs-anonymous distinction is exercised for real.
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mint = (ttlSeconds: number) =>
  mintMockJwt({ sub: "u1", email: "user@example.com", ttlSeconds });

/** See refresh-hook.integration.test.ts — MSW keeps only the first Set-Cookie per response. */
async function seedCookies(cookies: Record<string, string>): Promise<void> {
  for (const [name, value] of Object.entries(cookies)) {
    const seedUrl = api(`/__test__/seed-cookie/${name}`);
    server.use(
      mswHttp.post(
        seedUrl,
        () => new HttpResponse(null, { headers: { "Set-Cookie": `${name}=${value}; Path=/` } }),
      ),
    );
    await fetch(seedUrl, { method: "POST" });
  }
}

describe("fetchSession at the MSW boundary", () => {
  it("expired access_token + valid refresh_token resolves to the AUTHENTICATED session", async () => {
    await seedCookies({ [SESSION_COOKIE]: mint(-60), [REFRESH_COOKIE]: mint(30 * 24 * 3600) });
    const refreshSpy = vi.fn();
    server.use(
      mswHttp.post(api("/auth/refresh"), ({ cookies }) => {
        refreshSpy();
        const token = cookies[REFRESH_COOKIE];
        if (!token) return new HttpResponse(null, { status: 401 });
        // Mirror the real handler, and land the rotated access cookie so the
        // single re-read of `auth/me` presents a live token.
        return HttpResponse.json(
          { data: { message: "Refreshed" } },
          { headers: { "Set-Cookie": `${SESSION_COOKIE}=${mint(900)}; Path=/` } },
        );
      }),
    );

    // The bug: this used to resolve to `anonymousSession` with ZERO refreshes,
    // so the header rendered "Sign in" for a fully authenticated user.
    await expect(fetchSession()).resolves.toEqual({
      authenticated: true,
      user: { id: "u1", email: "user@example.com", name: "user", is_active: true },
    });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it("shares ONE refresh with a concurrent data-query 401 (F4 across both mechanisms)", async () => {
    await seedCookies({ [SESSION_COOKIE]: mint(-60), [REFRESH_COOKIE]: mint(30 * 24 * 3600) });
    const refreshSpy = vi.fn();

    // Countdown latch: hold the first `auth/me` and the first `/posts` open
    // until BOTH have arrived, so their 401s land in one genuine burst rather
    // than sequentially (sequential 401s legitimately refresh twice).
    let arrive!: () => void;
    let remaining = 2;
    const bothArrived = new Promise<void>((resolve) => {
      arrive = () => {
        remaining -= 1;
        if (remaining === 0) resolve();
      };
    });
    const stale = (cookies: Record<string, string>) => {
      const claims = decodeJwtPayload(cookies[SESSION_COOKIE] ?? "");
      const exp = typeof claims?.exp === "number" ? claims.exp : 0;
      return exp * 1000 <= Date.now();
    };

    server.use(
      mswHttp.post(api("/auth/refresh"), () => {
        refreshSpy();
        return HttpResponse.json(
          { data: { message: "Refreshed" } },
          { headers: { "Set-Cookie": `${SESSION_COOKIE}=${mint(900)}; Path=/` } },
        );
      }),
      mswHttp.get(api("/auth/me"), async ({ cookies }) => {
        if (!stale(cookies)) {
          return HttpResponse.json({
            data: { id: "u1", email: "user@example.com", name: "user", is_active: true },
          });
        }
        arrive();
        await bothArrived;
        return new HttpResponse(null, { status: 401 });
      }),
      mswHttp.get(api("/posts"), async ({ cookies }) => {
        if (!stale(cookies)) return HttpResponse.json({ data: [] });
        arrive();
        await bothArrived;
        return new HttpResponse(null, { status: 401 });
      }),
    );

    // A stale access token 401s BOTH the session probe (quiet path) and every
    // data query (ky afterResponse hook) on the same page load. These are two
    // different refresh mechanisms; if they don't share the in-flight promise
    // the backend sees two refreshes, and with refresh-token rotation the loser
    // gets a false 401 → spurious logout + redirect for a live session.
    const [session] = await Promise.all([fetchSession(), http.get("posts").json()]);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(session).toMatchObject({ authenticated: true });
  });

  it("no cookies at all: stays anonymous after exactly one refresh attempt", async () => {
    await seedCookies({ [SESSION_COOKIE]: "", [REFRESH_COOKIE]: "" });
    const refreshSpy = vi.fn(() => new HttpResponse(null, { status: 401 }));
    const logoutSpy = vi.fn(() => HttpResponse.json({ data: { message: "Signed out" } }));
    server.use(
      mswHttp.post(api("/auth/refresh"), refreshSpy),
      mswHttp.post(api("/auth/logout"), logoutSpy),
    );

    await expect(fetchSession()).resolves.toEqual(anonymousSession);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    // The session probe never escapes — no logout, and (being a plain promise)
    // no redirect. That ownership stays with the ky afterResponse hook.
    expect(logoutSpy).not.toHaveBeenCalled();
  });
});
