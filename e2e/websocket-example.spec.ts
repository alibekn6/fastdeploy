import { expect, test } from "@playwright/test";
import en from "../messages/en.json";

// The browser-only `ws.link()` mock (src/shared/api/mocks/ws-handlers.ts) runs
// inside the dev:mock worker; these assertions exercise the real page against
// it — no cookie is planted, so the route is reachable anonymously (public).
test.describe("WebSocket streaming example", () => {
  test("A13: the fidelity warning is visible on the page", async ({ page }) => {
    await page.goto("/examples/websocket");
    await expect(page.getByText("not covered by this repo's test suite")).toBeVisible();
  });

  test("A13: the badge reaches connected and mock messages appear", async ({ page }) => {
    await page.goto("/examples/websocket");
    await expect(page.getByRole("status")).toHaveText(en.WsExample.statusConnected, {
      timeout: 15_000,
    });
    const list = page.getByRole("list", { name: en.WsExample.messagesTitle });
    await expect(list.getByRole("listitem").first()).toBeVisible({ timeout: 15_000 });
  });
});
