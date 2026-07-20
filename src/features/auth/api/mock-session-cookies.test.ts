import { afterEach, describe, expect, it, vi } from "vitest";
import { writeMockSessionCookies } from "./mock-session-cookies";

afterEach(() => vi.restoreAllMocks());

describe("writeMockSessionCookies as the refreshed-token sink", () => {
  it("performs NO document.cookie write when NEXT_PUBLIC_API_MOCKING is not enabled", () => {
    // The unit env loads `.env` (NEXT_PUBLIC_API_MOCKING=disabled): production
    // path — the backend sets httpOnly cookies, the client must never write.
    const setCookie = vi.spyOn(document, "cookie", "set");
    writeMockSessionCookies({ access_token: "at-2" });
    expect(setCookie).not.toHaveBeenCalled();
    expect(document.cookie).toBe("");
  });

  it("accepts a refresh payload carrying only an access_token", () => {
    // The mock `auth/refresh` response rotates the access token ONLY, so the
    // sink must not require a refresh_token to be present.
    expect(() => writeMockSessionCookies({ access_token: "at-2" })).not.toThrow();
  });
});
