import { QueryClient } from "@tanstack/react-query";
import { delay, HttpResponse, type JsonBodyType, http as mswHttp } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http } from "@/shared/api/http";
import {
  countingRefreshHandler,
  refreshSuccessResolver,
} from "@/shared/api/mocks/counting-refresh-handler";
import { handlers, mintMockJwt } from "@/shared/api/mocks/handlers";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/shared/config/auth";
import { env } from "@/shared/config/env";
import { decodeJwtPayload } from "@/shared/lib/route-guard";
import { postQueries } from "./post-queries";

const api = (path: string) => new URL(path, env.NEXT_PUBLIC_API_URL).toString();

// MSW at the network boundary: the real shared handlers, per-test overrides.
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mint = (ttlSeconds: number) =>
  mintMockJwt({ sub: "u1", email: "user@example.com", ttlSeconds });

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

const isLiveToken = (token: string | undefined): boolean => {
  const exp = token ? decodeJwtPayload(token)?.exp : undefined;
  return typeof exp === "number" && exp * 1000 > Date.now();
};

/** 401 until the presented access-token cookie is live; then serve `payload`. */
function tokenGuardedResolver(payload: JsonBodyType, statuses: number[], on401: () => void) {
  return ({ cookies }: { cookies: Record<string, string> }) => {
    if (!isLiveToken(cookies[SESSION_COOKIE])) {
      statuses.push(401);
      on401();
      return new HttpResponse(null, { status: 401 });
    }
    statuses.push(200);
    return HttpResponse.json(payload);
  };
}

describe("postQueries under transparent session refresh (A7)", () => {
  it("expired access + valid refresh: posts data resolves, exactly ONE auth/refresh across ≥2 concurrent 401s, each original request retried once", async () => {
    await seedCookies({ [SESSION_COOKIE]: mint(-60), [REFRESH_COOKIE]: mint(3600) });

    // Hold the refresh response until BOTH original requests have 401ed, so
    // the two concurrent hook invocations demonstrably share one in-flight
    // refresh promise instead of refreshing back-to-back.
    let blocked401s = 0;
    let signalBothInFlight!: () => void;
    const both401sInFlight = new Promise<void>((resolve) => {
      signalBothInFlight = resolve;
    });
    const on401 = () => {
      blocked401s += 1;
      if (blocked401s >= 2) signalBothInFlight();
    };
    const statuses = { posts: [] as number[], users: [] as number[] };

    const postsResolver = vi.fn(
      tokenGuardedResolver([{ id: "1", title: "First", body: "Hello" }], statuses.posts, on401),
    );
    const usersResolver = vi.fn(
      tokenGuardedResolver(
        { id: "1", email: "ada@example.com", name: "ada", is_active: true },
        statuses.users,
        on401,
      ),
    );

    const { handler: refreshHandler, spy: refreshSpy } = countingRefreshHandler(async (info) => {
      await both401sInFlight;
      await delay(100);
      return refreshSuccessResolver(info);
    });

    server.use(
      refreshHandler,
      mswHttp.get(api("/posts"), postsResolver),
      mswHttp.get(api("/users/:id"), usersResolver),
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const [posts, user] = await Promise.all([
      queryClient.fetchQuery(postQueries.list()),
      http.get("users/1").json<{ id: string }>(),
    ]);

    // The dashboard query resolves with data — no login screen, no rejection.
    expect(posts).toEqual([{ id: "1", title: "First", body: "Hello" }]);
    expect(user).toMatchObject({ id: "1" });
    // Exactly one refresh for the whole 401 burst.
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    // Each original request 401ed once, then was retried exactly once, successfully.
    expect(statuses.posts).toEqual([401, 200]);
    expect(statuses.users).toEqual([401, 200]);
  });
});
