import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/shared/api/mocks/node";
import { anonymousSession } from "../model/session";
import { fetchSession, sessionKeys, sessionQueries } from "./session-queries";

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

  it("rethrows non-401 errors (normal query-error semantics)", async () => {
    server.use(
      http.get("*/auth/me", () =>
        HttpResponse.json({ error: { code: "boom", message: "Server error" } }, { status: 500 }),
      ),
    );
    await expect(fetchSession()).rejects.toThrow();
  });
});
