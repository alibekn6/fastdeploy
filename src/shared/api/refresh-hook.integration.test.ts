import { HttpResponse, http as mswHttp } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http } from "@/shared/api/http";
import { countingRefreshHandler } from "@/shared/api/mocks/counting-refresh-handler";
import { handlers, mintMockJwt } from "@/shared/api/mocks/handlers";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/shared/config/auth";
import { env } from "@/shared/config/env";
import { redirectToLogin } from "./refresh-hook";

const api = (path: string) => new URL(path, env.NEXT_PUBLIC_API_URL).toString();

// MSW at the network boundary: the real shared handlers, per-test overrides.
// (The A7 concurrency scenario over `postQueries` lives with the post entity —
// `src/entities/post/api/post-queries.integration.test.ts` — because shared
// must not import entities.)
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mint = (ttlSeconds: number) =>
  mintMockJwt({ sub: "u1", email: "user@example.com", ttlSeconds });

/**
 * Plant cookies into MSW's virtual cookie store via test-scoped endpoints'
 * `Set-Cookie` headers — the Node equivalent of the browser jar, presented on
 * every subsequent handler's `cookies` argument for this API origin. One
 * response per cookie: MSW's store only keeps the first of multiple
 * Set-Cookie headers on a single mocked response.
 */
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

describe("refresh hook on the shared http client", () => {
  it("retries exactly once: a still-401 retry rejects without re-triggering refresh", async () => {
    await seedCookies({ [SESSION_COOKIE]: mint(-60), [REFRESH_COOKIE]: mint(3600) });
    const postsResolver = vi.fn(() => new HttpResponse(null, { status: 401 }));
    const { handler: refreshHandler, spy: refreshSpy } = countingRefreshHandler();
    server.use(refreshHandler, mswHttp.get(api("/posts"), postsResolver));

    await expect(http.get("posts").json()).rejects.toHaveProperty("response.status", 401);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(postsResolver).toHaveBeenCalledTimes(2); // original + exactly one retry
  });

  it("refresh failure: fires auth/logout fire-and-forget, rejects the caller, never retries, and is SSR-safe", async () => {
    const { handler: refreshHandler, spy: refreshSpy } = countingRefreshHandler(() =>
      HttpResponse.json(
        { error: { code: "invalid_refresh", message: "Revoked" } },
        { status: 401 },
      ),
    );
    const logoutSpy = vi.fn(() => HttpResponse.json({ data: { message: "Signed out" } }));
    const postsResolver = vi.fn(() => new HttpResponse(null, { status: 401 }));
    server.use(
      refreshHandler,
      mswHttp.post(api("/auth/logout"), logoutSpy),
      mswHttp.get(api("/posts"), postsResolver),
    );

    await expect(http.get("posts").json()).rejects.toHaveProperty("response.status", 401);
    await vi.waitFor(() => expect(logoutSpy).toHaveBeenCalledTimes(1));
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(postsResolver).toHaveBeenCalledTimes(1); // failure path never retries

    // SSR safety: this project runs in Node — no window — and the failure path
    // above already executed the redirect helper without crashing. Direct call:
    expect(typeof window).toBe("undefined");
    expect(() => redirectToLogin()).not.toThrow();
  });
});
