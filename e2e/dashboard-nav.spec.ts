import { expect, test } from "@playwright/test";
import en from "../messages/en.json";
import ru from "../messages/ru.json";

// F12: from a logged-in dashboard, every /examples/* route must be reachable
// by clicking only.
test.describe("Dashboard example nav", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("user@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("clicking the SSR example card lands on /examples/ssr/1", async ({ page }) => {
    await page.getByRole("link", { name: new RegExp(en.Dashboard.ssrExampleTitle) }).click();
    await expect(page).toHaveURL(/\/examples\/ssr\/1$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("clicking the WebSocket example card lands on /examples/websocket", async ({ page }) => {
    await page.getByRole("link", { name: new RegExp(en.Dashboard.wsExampleTitle) }).click();
    await expect(page).toHaveURL(/\/examples\/websocket$/);
    // A heading-role lookup, not `getByText`: the client-side nav briefly
    // duplicates the title into Next's route announcer live region too.
    await expect(page.getByRole("heading", { name: en.WsExample.title })).toBeVisible();
  });

  test("clicking the SSE example card lands on /examples/sse", async ({ page }) => {
    await page.getByRole("link", { name: new RegExp(en.Dashboard.sseExampleTitle) }).click();
    await expect(page).toHaveURL(/\/examples\/sse$/);
    await expect(page.getByRole("heading", { name: en.SseExample.title })).toBeVisible();
  });

  test("links are locale-aware under /ru", async ({ page }) => {
    await page.goto("/ru/dashboard");
    await page.getByRole("link", { name: new RegExp(ru.Dashboard.sseExampleTitle) }).click();
    await expect(page).toHaveURL(/\/ru\/examples\/sse$/);
  });
});
