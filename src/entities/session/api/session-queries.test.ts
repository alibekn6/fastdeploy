import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/shared/api/mocks/node";
import { anonymousSession } from "../model/session";
import { fetchSession, sessionKeys, sessionQueries } from "./session-queries";

const unauthorized = () =>
  HttpResponse.json(
    { error: { code: "unauthorized", message: "Not authenticated" } },
    { status: 401 },
  );

describe("sessionKeys", () => {
  it('uses the pinned ["session"] query key', () => {
    expect(sessionKeys.current).toEqual(["session"]);
    expect(sessionQueries.current().queryKey).toEqual(["session"]);
  });
});

describe("fetchSession", () => {
  it("builds an authenticated session from the auth/me envelope", async () => {
    server.use(
      http.get("*/auth/me", () =>
        HttpResponse.json({
          data: { id: "u1", email: "user@example.com", name: "user", is_active: true },
        }),
      ),
    );
    await expect(fetchSession()).resolves.toEqual({
      authenticated: true,
      user: { id: "u1", email: "user@example.com", name: "user", is_active: true },
    });
  });

  it("resolves a 401 to anonymousSession instead of throwing", async () => {
    server.use(
      http.get("*/auth/me", () =>
        HttpResponse.json(
          { error: { code: "unauthorized", message: "Not authenticated" } },
          { status: 401 },
        ),
      ),
    );
    await expect(fetchSession()).resolves.toEqual(anonymousSession);
  });

  it("stale access token but refreshable session: refreshes once and re-reads auth/me", async () => {
    const meResolver = vi
      .fn<() => Response>()
      .mockImplementationOnce(unauthorized)
      .mockImplementation(() =>
        HttpResponse.json({
          data: { id: "u1", email: "user@example.com", name: "user", is_active: true },
        }),
      );
    const refreshResolver = vi.fn(() => HttpResponse.json({ data: { message: "Refreshed" } }));
    server.use(http.get("*/auth/me", meResolver), http.post("*/auth/refresh", refreshResolver));

    await expect(fetchSession()).resolves.toEqual({
      authenticated: true,
      user: { id: "u1", email: "user@example.com", name: "user", is_active: true },
    });
    expect(refreshResolver).toHaveBeenCalledTimes(1);
    expect(meResolver).toHaveBeenCalledTimes(2); // probe + exactly one re-read
  });

  it("genuinely anonymous: one refresh attempt, no retry, no loop", async () => {
    const meResolver = vi.fn(unauthorized);
    const refreshResolver = vi.fn(unauthorized);
    server.use(http.get("*/auth/me", meResolver), http.post("*/auth/refresh", refreshResolver));

    await expect(fetchSession()).resolves.toEqual(anonymousSession);
    expect(refreshResolver).toHaveBeenCalledTimes(1);
    expect(meResolver).toHaveBeenCalledTimes(1); // failed refresh never re-reads
  });

  it("refresh succeeds but auth/me still 401s: gives up at anonymousSession", async () => {
    const meResolver = vi.fn(unauthorized);
    const refreshResolver = vi.fn(() => HttpResponse.json({ data: { message: "Refreshed" } }));
    server.use(http.get("*/auth/me", meResolver), http.post("*/auth/refresh", refreshResolver));

    await expect(fetchSession()).resolves.toEqual(anonymousSession);
    expect(refreshResolver).toHaveBeenCalledTimes(1);
    expect(meResolver).toHaveBeenCalledTimes(2); // bounded — never a third
  });

  it("never fires auth/logout from the session probe (the http hook owns escape)", async () => {
    const logoutResolver = vi.fn(() => HttpResponse.json({ data: { message: "Signed out" } }));
    server.use(
      http.get("*/auth/me", unauthorized),
      http.post("*/auth/refresh", unauthorized),
      http.post("*/auth/logout", logoutResolver),
    );

    await expect(fetchSession()).resolves.toEqual(anonymousSession);
    expect(logoutResolver).not.toHaveBeenCalled();
  });

  it("rethrows non-401 errors (normal query-error semantics)", async () => {
    server.use(
      http.get("*/auth/me", () =>
        HttpResponse.json({ error: { code: "boom", message: "Server error" } }, { status: 500 }),
      ),
    );
    await expect(fetchSession()).rejects.toThrow();
  });
});
