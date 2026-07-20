import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { proxyToAnalytics } from "./ingest-proxy";

/** A port with nothing listening — the "unreachable analytics host" scenario. */
const DEAD_HOST = "http://127.0.0.1:9";

let live: Server;
let liveHost: string;

beforeAll(async () => {
  live = createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, url: req.url, method: req.method }));
  });
  await new Promise<void>((resolve) => live.listen(0, "127.0.0.1", resolve));
  const address = live.address();
  if (address === null || typeof address === "string") throw new Error("no port");
  liveHost = `http://127.0.0.1:${address.port}`;
});
afterAll(() => new Promise<void>((resolve) => live.close(() => resolve())));

const request = (url: string, init?: RequestInit) => new Request(url, init);

describe("proxyToAnalytics", () => {
  it("forwards path, query and method to the configured host", async () => {
    const response = await proxyToAnalytics(
      request("http://app.test/ingest/e/?ver=1", { method: "POST", body: "{}" }),
      ["e"],
      liveHost,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, url: "/e/?ver=1", method: "POST" });
  });

  it("contains an unreachable host as a 502 instead of an unhandled rejection", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // The bug: Next's blind `rewrites()` proxy had no error boundary here, so a
    // dead analytics host threw ECONNREFUSED out of the request pipeline and
    // dumped a full stack per event until libuv aborted the whole process.
    const response = await proxyToAnalytics(
      request("http://app.test/ingest/e/", { method: "POST", body: "{}" }),
      ["e"],
      DEAD_HOST,
    );

    expect(response.status).toBe(502);
    expect(warn).toHaveBeenCalledTimes(1); // one concise line, not a stack dump
    warn.mockRestore();
  });

  it("returns a parseable JSON body on 502 for a JSON endpoint (config, flags, capture, ...)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // The bug: an empty body degrades gracefully for posthog-js's status-gated
    // JSON parsing, but any caller that parses unconditionally hits
    // `JSON.parse("")` -> `Unexpected end of JSON input`.
    const response = await proxyToAnalytics(
      request("http://app.test/ingest/flags/?v=2", { method: "POST", body: "{}" }),
      ["flags"],
      DEAD_HOST,
    );

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({});
    warn.mockRestore();
  });

  it("returns a script-safe body on 502 for the config.js remote-config bootstrap", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await proxyToAnalytics(
      request("http://app.test/ingest/array/phc_test/config.js"),
      ["array", "phc_test", "config.js"],
      DEAD_HOST,
    );

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toContain("application/javascript");
    expect(await response.text()).toBe("");
    warn.mockRestore();
  });

  it("survives sustained traffic against a dead host without ever throwing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const responses = await Promise.all(
      Array.from({ length: 200 }, () =>
        proxyToAnalytics(
          request("http://app.test/ingest/e/", { method: "POST", body: "{}" }),
          ["e"],
          DEAD_HOST,
        ),
      ),
    );

    expect(responses.every((response) => response.status === 502)).toBe(true);
    warn.mockRestore();
  });

  it("returns 503 when no analytics host is configured (nothing to proxy to)", async () => {
    const response = await proxyToAnalytics(
      request("http://app.test/ingest/e/", { method: "POST", body: "{}" }),
      ["e"],
      undefined,
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({});
  });

  it("returns a script-safe body on 503 for config.js when analytics is unconfigured", async () => {
    const response = await proxyToAnalytics(
      request("http://app.test/ingest/array/phc_test/config.js"),
      ["array", "phc_test", "config.js"],
      undefined,
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/javascript");
    expect(await response.text()).toBe("");
  });
});
