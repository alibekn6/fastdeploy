import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { http } from "@/shared/api/http";
import { handlers, mintMockJwt } from "./handlers";

// Risk-9 canary: a request built through the SHARED ky client (its `baseUrl` +
// no-leading-slash path) must be intercepted by the corresponding MSW handler
// (both derive URLs from NEXT_PUBLIC_API_URL). `onUnhandledRequest: "error"`
// makes any URL-pattern drift fail loudly instead of escaping to the network.
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("ky ↔ MSW URL-match canary (Risk 9)", () => {
  it("POST auth/login through the shared client hits the login handler and returns the envelope", async () => {
    const body = (await http
      .post("auth/login", { json: { email: "user@example.com", password: "password123" } })
      .json()) as {
      data?: { message?: string; mock_tokens?: { access_token?: string; refresh_token?: string } };
    };
    expect(body.data?.message).toBeTypeOf("string");
    expect(body.data?.mock_tokens?.access_token).toBeTypeOf("string");
    expect(body.data?.mock_tokens?.refresh_token).toBeTypeOf("string");
  });

  it("GET auth/me echoes the identity from the access_token cookie", async () => {
    const access = mintMockJwt({ sub: "u7", email: "Ada.L@example.com", ttlSeconds: 900 });
    const body = (await http
      .get("auth/me", { headers: { cookie: `access_token=${access}` } })
      .json()) as { data?: { id?: string; email?: string; name?: string | null } };
    expect(body.data?.id).toBe("u7");
    expect(body.data?.email).toBe("Ada.L@example.com");
    expect(body.data?.name).toBe("ada.l");
  });

  it("POST auth/refresh validates only the refresh_token cookie", async () => {
    await expect(http.post("auth/refresh").json()).rejects.toThrow();

    const refresh = mintMockJwt({ sub: "u1", email: "user@example.com", ttlSeconds: 3600 });
    const body = (await http
      .post("auth/refresh", { headers: { cookie: `refresh_token=${refresh}` } })
      .json()) as { data?: { mock_tokens?: { access_token?: string } } };
    expect(body.data?.mock_tokens?.access_token).toBeTypeOf("string");
  });

  it("POST auth/logout succeeds with no auth check; GET posts stays envelope-free", async () => {
    const logout = (await http.post("auth/logout").json()) as { data?: { message?: string } };
    expect(logout.data?.message).toBeTypeOf("string");

    const posts = await http.get("posts").json();
    expect(Array.isArray(posts)).toBe(true);
  });
});
