import { expect, test } from "@playwright/test";

test("unauthenticated dashboard redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("signup with a fresh email -> dashboard with a session", async ({ context, page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill("fresh@example.com");
  await page.getByLabel("Password", { exact: true }).fill("a-long-enough-password");
  await page.getByLabel("Confirm password").fill("a-long-enough-password");
  await page.getByRole("button", { name: /create account/i }).click();
  // A3: a fresh email registers, lands on /dashboard with a live session — the
  // header shows the email and BOTH auth cookies exist.
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("user-email")).toContainText("fresh@example.com");
  const cookieNames = (await context.cookies()).map((cookie) => cookie.name);
  expect(cookieNames).toContain("access_token");
  expect(cookieNames).toContain("refresh_token");
});

test("login -> dashboard -> logout", async ({ context, page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  // A1: valid credentials land on /dashboard with a live session — the header
  // shows the email and BOTH auth cookies exist.
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("user-email")).toContainText("user@example.com");
  const cookieNames = (await context.cookies()).map((cookie) => cookie.name);
  expect(cookieNames).toContain("access_token");
  expect(cookieNames).toContain("refresh_token");
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login/);
});
