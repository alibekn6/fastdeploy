import { HttpResponse, http as mswHttp } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http } from "@/shared/api/http";
import { countingRefreshHandler } from "@/shared/api/mocks/counting-refresh-handler";
import { handlers, mintMockJwt } from "@/shared/api/mocks/handlers";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/shared/config/auth";
import { env } from "@/shared/config/env";
import { routes } from "@/shared/config/routes";

const api = (path: string) => new URL(path, env.NEXT_PUBLIC_API_URL).toString();

// MSW at the network boundary: the real shared handlers, per-test overrides.
// The revoked-session scenario (F5/A8) models a BACKEND-revoked-but-unexpired
// refresh token: the cookie is present (and would decode as live), but the
// server 401s `auth/refresh` — produced with a per-test override, never a
// test-only endpoint in the shipped handlers.
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  server.events.removeAllListeners();
  vi.unstubAllGlobals();
});
afterAll(() => server.close());

const mint = (ttlSeconds: number) =>
  mintMockJwt({ sub: "u1", email: "user@example.com", ttlSeconds });

/** Per-test override: the backend has revoked the refresh token server-side. */
const revokedRefreshResolver = () =>
  HttpResponse.json(
    { error: { code: "invalid_refresh", message: "Refresh token revoked" } },
    { status: 401 },
  );

/**
 * The redirect seam the shipped wiring exposes: `http`'s hook is
 * `createRefreshHook(redirectToLogin)`, and `redirectToLogin` defaults to
 * `window.location`. Stubbing `window` with a spied `location` observes the
 * real shipped escape path end to end — the `assign` call count is the
 * redirect-loop measure (A8: exactly once, to login).
 */
function stubWindowLocation(pathname: string) {
  const assign = vi.fn();
  vi.stubGlobal("window", { location: { pathname, assign } });
  return assign;
}

/**
 * Plant cookies into MSW's virtual cookie store via test-scoped endpoints'
 * `Set-Cookie` headers — the Node equivalent of the browser jar. One response
 * per cookie: MSW's store only keeps the first of multiple Set-Cookie headers
 * on a single mocked response.
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

/**
 * Replay `Set-Cookie` headers one response at a time so MSW's jar applies all
 * of them — browser-jar parity over the same single-header-per-response
 * limitation `seedCookies` documents. Only headers a real response actually
 * carried are replayed, so jar-level assertions still track the handler's
 * contract: if the handler stops emitting a clearing header, nothing replays
 * it and the absence assertion fails.
 */
let replaySeq = 0;
async function applySetCookieHeaders(setCookieHeaders: string[]): Promise<void> {
  for (const header of setCookieHeaders) {
    const replayUrl = api(`/__test__/replay-set-cookie/${replaySeq++}`);
    server.use(
      mswHttp.post(replayUrl, () => new HttpResponse(null, { headers: { "Set-Cookie": header } })),
    );
    await fetch(replayUrl, { method: "POST" });
  }
}

/** What a subsequent request would present from MSW's cookie jar. */
async function probeCookies(): Promise<Record<string, string>> {
  const probeUrl = api("/__test__/cookie-probe");
  server.use(mswHttp.get(probeUrl, ({ cookies }) => HttpResponse.json(cookies)));
  const response = await fetch(probeUrl);
  return (await response.json()) as Record<string, string>;
}

/** Cookie names a `Set-Cookie` header list deletes (`Max-Age=0`). */
function clearedCookieNames(setCookieHeaders: string[]): string[] {
  return setCookieHeaders
    .filter((header) => /;\s*max-age=0\s*(;|$)/i.test(header))
    .map((header) => header.split("=")[0]?.trim() ?? "");
}

describe("revoked-session escape (F5/A8)", () => {
  it("revoked refresh: the 401ing request escapes to login exactly once and auth/logout clears both cookies", async () => {
    await seedCookies({ [SESSION_COOKIE]: mint(-60), [REFRESH_COOKIE]: mint(3600) });
    const assign = stubWindowLocation("/dashboard");

    const { handler: refreshHandler, spy: refreshSpy } =
      countingRefreshHandler(revokedRefreshResolver);
    const postsResolver = vi.fn(() => new HttpResponse(null, { status: 401 }));
    // Observe the SHIPPED auth/logout handler (deliberately not overridden —
    // this test pins its cookie-clearing contract) via life-cycle events.
    const logoutResponses: Response[] = [];
    server.events.on("response:mocked", ({ request, response }) => {
      if (new URL(request.url).pathname === "/auth/logout") logoutResponses.push(response);
    });
    server.use(refreshHandler, mswHttp.get(api("/posts"), postsResolver));

    await expect(http.get("posts").json()).rejects.toHaveProperty("response.status", 401);

    // Final location = the login route, navigated to EXACTLY once (loop measure).
    await vi.waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    expect(assign).toHaveBeenCalledWith(routes.login);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(postsResolver).toHaveBeenCalledTimes(1); // failed refresh: never retried

    // Contract level: the shipped always-200 logout response deletes BOTH
    // httpOnly cookies — the only way out when a revoked-but-unexpired access
    // token would bounce /login straight back to /dashboard.
    await vi.waitFor(() => expect(logoutResponses).toHaveLength(1));
    const setCookieHeaders = logoutResponses[0]?.headers.getSetCookie() ?? [];
    expect(clearedCookieNames(setCookieHeaders)).toEqual([SESSION_COOKIE, REFRESH_COOKIE]);

    // Jar level: after applying the logout response's own headers, neither
    // cookie is presented on subsequent requests.
    await applySetCookieHeaders(setCookieHeaders);
    const cookiesAfter = await probeCookies();
    expect(cookiesAfter).not.toHaveProperty(SESSION_COOKIE);
    expect(cookiesAfter).not.toHaveProperty(REFRESH_COOKIE);

    // The post-escape login page's own session probe (auth/me → 401) must not
    // re-enter the refresh path — no second refresh, no second navigation.
    await expect(http.get("auth/me").json()).rejects.toHaveProperty("response.status", 401);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it("concurrent 401s during one failed refresh: exactly ONE redirect and ONE logout for the whole burst", async () => {
    await seedCookies({ [SESSION_COOKIE]: mint(-60), [REFRESH_COOKIE]: mint(3600) });
    const assign = stubWindowLocation("/dashboard");

    // Hold the refresh 401 until BOTH originals have 401ed, so both hook
    // invocations demonstrably share the single failing in-flight refresh.
    let blocked401s = 0;
    let signalBothInFlight!: () => void;
    const both401sInFlight = new Promise<void>((resolve) => {
      signalBothInFlight = resolve;
    });
    const respond401 = () => {
      blocked401s += 1;
      if (blocked401s >= 2) signalBothInFlight();
      return new HttpResponse(null, { status: 401 });
    };

    const postsResolver = vi.fn(respond401);
    const usersResolver = vi.fn(respond401);
    const { handler: refreshHandler, spy: refreshSpy } = countingRefreshHandler(async () => {
      await both401sInFlight;
      return revokedRefreshResolver();
    });
    const logoutSpy = vi.fn(() => HttpResponse.json({ data: { message: "Signed out" } }));
    server.use(
      refreshHandler,
      mswHttp.post(api("/auth/logout"), logoutSpy),
      mswHttp.get(api("/posts"), postsResolver),
      mswHttp.get(api("/users/:id"), usersResolver),
    );

    const results = await Promise.allSettled([
      http.get("posts").json(),
      http.get("users/1").json(),
    ]);
    expect(results.map((result) => result.status)).toEqual(["rejected", "rejected"]);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(logoutSpy).toHaveBeenCalledTimes(1));
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(routes.login);
    expect(postsResolver).toHaveBeenCalledTimes(1);
    expect(usersResolver).toHaveBeenCalledTimes(1);

    // Let any stray fire-and-forget work settle: still exactly one of each.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(assign).toHaveBeenCalledTimes(1);
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });

  it("fires auth/logout but redirects promptly without awaiting its completion", async () => {
    await seedCookies({ [SESSION_COOKIE]: mint(-60), [REFRESH_COOKIE]: mint(3600) });
    const assign = stubWindowLocation("/dashboard");

    let releaseLogout!: () => void;
    const logoutGate = new Promise<void>((resolve) => {
      releaseLogout = resolve;
    });
    let logoutSettled = false;
    const logoutSpy = vi.fn(async () => {
      await logoutGate;
      logoutSettled = true;
      return HttpResponse.json({ data: { message: "Signed out" } });
    });
    const { handler: refreshHandler } = countingRefreshHandler(revokedRefreshResolver);
    server.use(
      refreshHandler,
      mswHttp.post(api("/auth/logout"), logoutSpy),
      mswHttp.get(api("/posts"), () => new HttpResponse(null, { status: 401 })),
    );

    await expect(http.get("posts").json()).rejects.toHaveProperty("response.status", 401);

    // The caller settled and the redirect fired while logout was still held open.
    await vi.waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(logoutSpy).toHaveBeenCalledTimes(1));
    expect(logoutSettled).toBe(false);

    releaseLogout();
    await vi.waitFor(() => expect(logoutSettled).toBe(true));
  });
});
