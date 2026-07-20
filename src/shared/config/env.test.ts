import { describe, expect, it } from "vitest";
import { secureApiUrl, secureWsUrl } from "./env";

// A20 (spec §2.7): the env refines are build-time enforcement that production
// cannot ship plaintext transports — `ws://`/`http://` pass only on localhost.
describe("secureWsUrl (NEXT_PUBLIC_WS_URL refine)", () => {
  it.each([
    "wss://api.example.com/ws",
    "wss://ws.example.com:8443/live",
    "ws://localhost:3000/ws",
    "ws://127.0.0.1:8080/ws",
  ])("accepts %s", (url) => {
    expect(secureWsUrl.safeParse(url).success).toBe(true);
  });

  it.each([
    "ws://api.example.com/ws",
    "ws://ws.example.com:8080/live",
    "http://api.example.com/ws",
    // Localhost relaxes TLS, never the scheme itself.
    "https://localhost/ws",
    "http://localhost:3000/ws",
    "not-a-url",
  ])("rejects %s", (url) => {
    expect(secureWsUrl.safeParse(url).success).toBe(false);
  });
});

describe("secureApiUrl (NEXT_PUBLIC_API_URL refine)", () => {
  it.each([
    "https://api.example.com",
    "https://api.example.com:8443/v1",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
  ])("accepts %s", (url) => {
    expect(secureApiUrl.safeParse(url).success).toBe(true);
  });

  it.each([
    "http://api.example.com",
    "http://api.internal:8000",
    "not-a-url",
  ])("rejects %s", (url) => {
    expect(secureApiUrl.safeParse(url).success).toBe(false);
  });
});
