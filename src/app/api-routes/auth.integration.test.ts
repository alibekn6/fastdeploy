import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: (n: string, v: string) => store.set(n, v),
    get: (n: string) => (store.has(n) ? { value: store.get(n) } : undefined),
    delete: (n: string) => store.delete(n),
  }),
}));

const server = setupServer(http.post("*/auth/login", () => HttpResponse.json({ token: "tok" })));
beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  store.clear();
});
afterAll(() => server.close());

import { login, logout } from "./auth";

describe("BFF auth", () => {
  it("login sets session cookie", async () => {
    await login(
      new Request("http://x/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "a@b.c", password: "x" }),
      }),
    );
    expect(store.get("session")).toBe("tok");
  });
  it("logout clears it", async () => {
    store.set("session", "tok");
    await logout();
    expect(store.has("session")).toBe(false);
  });
});
