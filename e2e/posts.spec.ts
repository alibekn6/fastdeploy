import { expect, test } from "@playwright/test";

test("create a post appears in the list", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByPlaceholder("Title").fill("E2E Post");
  await page.getByPlaceholder("Content").fill("from playwright");
  await page.getByRole("button", { name: /add/i }).click();
  await expect(page.getByText("E2E Post")).toBeVisible();
});
