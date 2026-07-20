import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRefreshHook, isAuthUrl, localizedLoginPath, redirectToLogin } from "./refresh-hook";

const API = "https://api.example.com";

type Hook = ReturnType<typeof createRefreshHook>;
type HookState = Parameters<Hook>[0];

function state(url: string, status: number): HookState {
  return {
    request: new Request(url),
    options: {},
    response: new Response(null, { status }),
    retryCount: 0,
  } as unknown as HookState;
}

const fetchMock = vi.fn<typeof fetch>();
const urlOf = (input: Parameters<typeof fetch>[0]) =>
  input instanceof Request ? input.url : String(input);
const callsTo = (segment: string) =>
  fetchMock.mock.calls.filter(([input]) => urlOf(input).includes(segment));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("isAuthUrl", () => {
  it.each([
    "auth/login",
    "auth/register",
    "auth/refresh",
    "auth/logout",
    "auth/me",
  ])("excludes %s from the refresh path", (path) => {
    expect(isAuthUrl(`${API}/${path}`)).toBe(true);
  });

  it.each(["posts", "users/1"])("keeps %s refresh-eligible", (path) => {
    expect(isAuthUrl(`${API}/${path}`)).toBe(false);
  });
});

describe("localizedLoginPath", () => {
  it.each([
    ["/dashboard", "/login"],
    ["/", "/login"],
    ["/ru/dashboard", "/ru/login"],
    ["/kk", "/kk/login"],
    // A non-locale segment that merely starts like one must not be echoed.
    ["/rutabaga/deep", "/login"],
  ])("maps %s to %s", (pathname, expected) => {
    expect(localizedLoginPath(pathname)).toBe(expected);
  });
});

describe("redirectToLogin", () => {
  it("navigates to the localized login route for the current pathname", () => {
    const assign = vi.fn();
    redirectToLogin({ pathname: "/ru/dashboard", assign });
    expect(assign).toHaveBeenCalledExactlyOnceWith("/ru/login");
  });

  it("is a no-op outside a browser context", () => {
    // Explicit `undefined` would re-trigger the default parameter — simulate
    // a server context instead, where the default itself resolves to no-op.
    vi.stubGlobal("window", undefined);
    expect(() => redirectToLogin()).not.toThrow();
  });
});

describe("createRefreshHook", () => {
  it("passes non-401 responses through untouched", async () => {
    const hook = createRefreshHook(vi.fn());
    await expect(hook(state(`${API}/posts`, 500))).resolves.toBeUndefined();
    await expect(hook(state(`${API}/posts`, 200))).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never refreshes on a 401 from an auth route (no recursion)", async () => {
    const hook = createRefreshHook(vi.fn());
    for (const path of ["auth/login", "auth/refresh", "auth/logout", "auth/me"]) {
      await expect(hook(state(`${API}/${path}`, 401))).resolves.toBeUndefined();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("on 401: refreshes with credentials, then returns the retried original request's response", async () => {
    const retried = new Response(JSON.stringify([{ id: "1" }]), { status: 200 });
    fetchMock.mockImplementation(async (input) =>
      urlOf(input).includes("/auth/refresh") ? new Response(null, { status: 200 }) : retried,
    );

    const hook = createRefreshHook(vi.fn());
    await expect(hook(state(`${API}/posts`, 401))).resolves.toBe(retried);

    const [refreshCall] = callsTo("/auth/refresh");
    expect(refreshCall).toBeDefined();
    expect(String(refreshCall?.[0])).toBe(`${API}/auth/refresh`);
    expect(refreshCall?.[1]).toMatchObject({ method: "POST", credentials: "include" });

    const [retryInput] = fetchMock.mock.calls.at(-1) ?? [];
    expect(retryInput).toBeInstanceOf(Request);
    expect((retryInput as Request).url).toBe(`${API}/posts`);
  });

  it("dedupes concurrent 401s into a single in-flight refresh", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    fetchMock.mockImplementation(async (input) => {
      if (urlOf(input).includes("/auth/refresh")) {
        await gate;
        return new Response(null, { status: 200 });
      }
      return new Response("[]", { status: 200 });
    });

    const hook = createRefreshHook(vi.fn());
    const first = hook(state(`${API}/posts`, 401));
    const second = hook(state(`${API}/users/1`, 401));
    release();
    await Promise.all([first, second]);

    expect(callsTo("/auth/refresh")).toHaveLength(1);
    expect(callsTo("/posts")).toHaveLength(1);
    expect(callsTo("/users/1")).toHaveLength(1);
  });

  it("on refresh failure: fires auth/logout fire-and-forget, calls onAuthFailure, never retries", async () => {
    fetchMock.mockImplementation(async (input) => {
      if (urlOf(input).includes("/auth/refresh")) return new Response(null, { status: 401 });
      if (urlOf(input).includes("/auth/logout")) return new Response(null, { status: 200 });
      throw new Error(`unexpected fetch: ${urlOf(input)}`);
    });

    const onAuthFailure = vi.fn();
    const hook = createRefreshHook(onAuthFailure);
    await expect(hook(state(`${API}/posts`, 401))).resolves.toBeUndefined();

    expect(onAuthFailure).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(callsTo("/auth/logout")).toHaveLength(1));
    // The original request was never re-fetched.
    expect(fetchMock.mock.calls.some(([input]) => input instanceof Request)).toBe(false);
  });

  it("hands the refreshed mock_tokens to onTokens, then still returns the retried response", async () => {
    const retried = new Response("[]", { status: 200 });
    fetchMock.mockImplementation(async (input) =>
      urlOf(input).includes("/auth/refresh")
        ? Response.json({ data: { message: "Refreshed", mock_tokens: { access_token: "at-2" } } })
        : retried,
    );

    const onTokens = vi.fn();
    const hook = createRefreshHook(vi.fn(), onTokens);
    await expect(hook(state(`${API}/posts`, 401))).resolves.toBe(retried);

    expect(onTokens).toHaveBeenCalledExactlyOnceWith({ access_token: "at-2" });
  });

  it("does not call onTokens when the refresh body carries no mock_tokens (production shape)", async () => {
    fetchMock.mockImplementation(async (input) =>
      urlOf(input).includes("/auth/refresh")
        ? Response.json({ data: { message: "Refreshed" } })
        : new Response("[]", { status: 200 }),
    );

    const onTokens = vi.fn();
    const hook = createRefreshHook(vi.fn(), onTokens);
    await hook(state(`${API}/posts`, 401));

    expect(onTokens).not.toHaveBeenCalled();
  });

  it("still refreshes and retries when no onTokens callback is wired", async () => {
    const retried = new Response("[]", { status: 200 });
    fetchMock.mockImplementation(async (input) =>
      urlOf(input).includes("/auth/refresh")
        ? Response.json({ data: { mock_tokens: { access_token: "at-2" } } })
        : retried,
    );

    const hook = createRefreshHook(vi.fn());
    await expect(hook(state(`${API}/posts`, 401))).resolves.toBe(retried);
    expect(callsTo("/auth/refresh")).toHaveLength(1);
  });

  it("survives an unreadable refresh body without failing the retry", async () => {
    const retried = new Response("[]", { status: 200 });
    fetchMock.mockImplementation(async (input) =>
      urlOf(input).includes("/auth/refresh") ? new Response("not json", { status: 200 }) : retried,
    );

    const onTokens = vi.fn();
    const hook = createRefreshHook(vi.fn(), onTokens);
    await expect(hook(state(`${API}/posts`, 401))).resolves.toBe(retried);
    expect(onTokens).not.toHaveBeenCalled();
  });

  it("a throwing onTokens sink cannot turn a SUCCESSFUL refresh into a logout + redirect", async () => {
    const retried = new Response("[]", { status: 200 });
    fetchMock.mockImplementation(async (input) =>
      urlOf(input).includes("/auth/refresh")
        ? Response.json({ data: { mock_tokens: { access_token: "at-2" } } })
        : retried,
    );

    const onAuthFailure = vi.fn();
    const hook = createRefreshHook(onAuthFailure, () => {
      throw new Error("sink blew up");
    });

    await expect(hook(state(`${API}/posts`, 401))).resolves.toBe(retried);
    expect(onAuthFailure).not.toHaveBeenCalled();
    expect(callsTo("/auth/logout")).toHaveLength(0);
  });

  it("swallows a transport-level logout failure and still reports auth failure", async () => {
    fetchMock.mockImplementation(async (input) => {
      if (urlOf(input).includes("/auth/refresh")) return new Response(null, { status: 401 });
      throw new TypeError("network down");
    });

    const onAuthFailure = vi.fn();
    const hook = createRefreshHook(onAuthFailure);
    await expect(hook(state(`${API}/posts`, 401))).resolves.toBeUndefined();
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(callsTo("/auth/logout")).toHaveLength(1));
  });
});
