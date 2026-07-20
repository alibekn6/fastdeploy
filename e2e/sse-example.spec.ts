import { expect, test } from "@playwright/test";
import en from "../messages/en.json";

// `/api/sse` is a REAL Next route handler (app/api/sse/route.ts), not an MSW
// mock — these assertions exercise it end to end, with or without mock mode.
// No cookie is planted: the route is reachable anonymously (public path).
test.describe("Server-Sent Events example", () => {
  test("F11: the ordinary-HTTP contrast note is visible on the page", async ({ page }) => {
    await page.goto("/examples/sse");
    await expect(page.getByText("SSE is ordinary HTTP")).toBeVisible();
  });

  test("F11: the badge reaches open and events accumulate", async ({ page }) => {
    await page.goto("/examples/sse");
    await expect(page.getByRole("status")).toHaveText(en.SseExample.statusOpen, {
      timeout: 15_000,
    });
    const list = page.getByRole("list", { name: en.SseExample.messagesTitle });
    // The stream pushes a `notice` immediately, then `update` frames every
    // second — wait for at least two so both named events are exercised.
    await expect(list.getByRole("listitem")).toHaveCount(2, { timeout: 15_000 });
  });
});
