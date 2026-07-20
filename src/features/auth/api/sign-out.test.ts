import { QueryClient } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetUser } from "@/shared/analytics";
import { server } from "@/shared/api/mocks/node";
import { signOut } from "./sign-out";

vi.mock("@/shared/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/analytics")>()),
  resetUser: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

describe("signOut action (A9 unit)", () => {
  it("calls auth/logout, clears the ENTIRE query cache, and resets analytics", async () => {
    let logoutCalled = false;
    server.use(
      http.post("*/auth/logout", () => {
        logoutCalled = true;
        return HttpResponse.json({ data: { message: "Signed out" } });
      }),
    );
    const queryClient = new QueryClient();
    const clear = vi.spyOn(queryClient, "clear");
    const push = vi.fn();

    await signOut(queryClient, { push });

    expect(logoutCalled).toBe(true);
    // Stale authenticated data must not survive into another user's session
    // on a shared browser — the WHOLE cache goes, not just ["session"].
    expect(clear).toHaveBeenCalledTimes(1);
    expect(resetUser).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/");
  });

  it("performs NO document.cookie write when NEXT_PUBLIC_API_MOCKING is not enabled", async () => {
    // The unit env loads `.env` (NEXT_PUBLIC_API_MOCKING=disabled): production
    // path — only the backend can expire the httpOnly cookies. The shipped
    // logout mock answers with clearing Set-Cookie headers (its §2.4 contract),
    // which MSW mirrors onto document.cookie in jsdom — the mock backend's
    // write, not the feature's. Override with a header-less 200 so the spy
    // observes only signOut's own writes.
    server.use(
      http.post("*/auth/logout", () => HttpResponse.json({ data: { message: "Signed out" } })),
    );
    const setCookie = vi.spyOn(document, "cookie", "set");
    await signOut(new QueryClient(), { push: vi.fn() });
    expect(setCookie).not.toHaveBeenCalled();
  });
});
