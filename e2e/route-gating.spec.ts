import { expect, test } from "@playwright/test";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/shared/config/auth";

const BASE = `http://localhost:${process.env.PORT ?? 3000}`;

// Mirrors the MSW mint helper's pinned unsigned-JWT format (handlers.ts) so
// the specs can plant decodable cookies without importing the app's env stack.
const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const mintJwt = (payload: object) =>
  `${b64url({ alg: "none", typ: "JWT" })}.${b64url(payload)}.mock`;

test("anonymous /ru/dashboard lands on /ru/login with lang=ru", async ({ page }) => {
  await page.goto("/ru/dashboard");
  await expect(page).toHaveURL(/\/ru\/login$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
});

test("a live access-token cookie on /login bounces to /dashboard", async ({ context, page }) => {
  const now = Math.floor(Date.now() / 1000);
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: mintJwt({ sub: "u1", email: "user@example.com", exp: now + 900, iat: now }),
      url: BASE,
    },
  ]);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("an EXPIRED access token with a live refresh token still renders the signed-in header", async ({
  context,
  page,
}) => {
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub: "u1", email: "user@example.com" };
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: mintJwt({ ...claims, exp: now - 60, iat: now - 960 }),
      url: BASE,
    },
    {
      name: REFRESH_COOKIE,
      value: mintJwt({ ...claims, exp: now + 30 * 24 * 3600, iat: now }),
      url: BASE,
    },
  ]);
  await page.goto("/dashboard");

  // The bug: `auth/me` is (correctly) excluded from the ky refresh hook, so its
  // 401 became `anonymousSession` and the header advertised "Sign in" to a user
  // whose session was merely 15 minutes stale. It must now refresh and recover.
  await expect(page.getByTestId("user-email")).toHaveText("user@example.com");
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
});

test("a refresh-token-only cookie on /login stays on /login", async ({ context, page }) => {
  await context.addCookies([{ name: REFRESH_COOKIE, value: "opaque-refresh", url: BASE }]);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Email")).toBeVisible();
});
