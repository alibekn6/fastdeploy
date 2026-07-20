import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signIn } from "./sign-in";

afterEach(() => vi.restoreAllMocks());

describe("signIn mock-cookie gate", () => {
  it("performs NO document.cookie write on success when NEXT_PUBLIC_API_MOCKING is not enabled", async () => {
    // The unit env loads `.env` (NEXT_PUBLIC_API_MOCKING=disabled): production
    // path — the backend sets httpOnly cookies, the client must never write.
    const setCookie = vi.spyOn(document, "cookie", "set");
    await signIn(
      { email: "user@example.com", password: "correct horse battery" },
      new QueryClient(),
    );
    expect(setCookie).not.toHaveBeenCalled();
    expect(document.cookie).toBe("");
  });
});
