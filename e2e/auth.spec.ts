import { expect, test } from "@playwright/test";
import en from "../messages/en.json";
import ru from "../messages/ru.json";

test("unauthenticated dashboard redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("login -> dashboard -> sign out (A9)", async ({ context, page }) => {
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
  // A9: sign out lands on the localized home page, the dashboard is gated
  // again, and BOTH auth cookies are gone.
  await page.getByRole("button", { name: en.Common.signOut }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  const cookieNamesAfter = (await context.cookies()).map((cookie) => cookie.name);
  expect(cookieNamesAfter).not.toContain("access_token");
  expect(cookieNamesAfter).not.toContain("refresh_token");
});

test("sign-out from /ru/dashboard lands on /ru (locale preserved)", async ({ page }) => {
  await page.goto("/ru/login");
  await page.getByLabel(ru.Auth.email).fill("user@example.com");
  await page.getByLabel(ru.Auth.password).fill("password123");
  await page.getByRole("button", { name: ru.Auth.submit }).click();
  await expect(page).toHaveURL(/\/ru\/dashboard$/);
  await page.getByRole("button", { name: ru.Common.signOut }).click();
  await expect(page).toHaveURL(/\/ru$/);
});
