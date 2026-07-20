import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http } from "./http";
import { setRefreshedTokensSink } from "./refreshed-tokens";

const API = "https://api.example.com";

const fetchMock = vi.fn<typeof fetch>();
const urlOf = (input: Parameters<typeof fetch>[0]) =>
  input instanceof Request ? input.url : String(input);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  setRefreshedTokensSink(null);
});

describe("http refreshed-token sink gate", () => {
  it("never notifies the sink when NEXT_PUBLIC_API_MOCKING is not enabled", async () => {
    // The unit env loads `.env` (NEXT_PUBLIC_API_MOCKING=disabled): production
    // path — the backend sets httpOnly cookies, so the mock-token side effect
    // must not even be wired, let alone fire.
    const sink = vi.fn();
    setRefreshedTokensSink(sink);

    // First response 401 -> the hook refreshes, then retries the original.
    let first = true;
    fetchMock.mockImplementation(async (input) => {
      if (urlOf(input).includes("/auth/refresh")) {
        return Response.json({ data: { mock_tokens: { access_token: "at-2" } } });
      }
      if (first) {
        first = false;
        return new Response(null, { status: 401 });
      }
      return new Response("[]", { status: 200 });
    });

    await http.get(`${API}/posts`).json();

    expect(sink).not.toHaveBeenCalled();
  });
});
