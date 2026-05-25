import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { getValidated } from "./fetcher";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const Schema = z.object({ id: z.string() });

describe("getValidated", () => {
  it("parses a valid response", async () => {
    server.use(http.get("*/widgets/1", () => HttpResponse.json({ id: "1" })));
    await expect(getValidated("widgets/1", Schema)).resolves.toEqual({ id: "1" });
  });
  it("throws on contract drift", async () => {
    server.use(http.get("*/widgets/2", () => HttpResponse.json({ nope: true })));
    await expect(getValidated("widgets/2", Schema)).rejects.toThrow();
  });
});
