import { defineConfig, devices } from "@playwright/test";

// Overridable so parallel checkouts/agents don't collide on one port —
// `next dev`/`next start` honor the same PORT variable for the webServer.
const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Locally this is `pnpm dev:mock` (one Turbopack dev server, not the built
  // `pnpm start` CI uses) — `workers: undefined` defaults to one worker per
  // core, and that many concurrent navigations against a single dev server
  // triggers cold-compile contention: `e2e/auth.spec.ts` signup timing out on
  // `getByLabel('Email')` with the Next dev error overlay in the page
  // snapshot, even though the same test passes 3/3 in isolation. Capped to 4
  // (validated with 5 consecutive cold `rm -rf .next && pnpm e2e` runs, all
  // green) — enough parallelism to keep local iteration fast without
  // saturating the one dev server it's actually served by.
  workers: isCI ? 1 : 4,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "html",
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // NEXT_PUBLIC_POSTHOG_KEY is NOT blanked here any more. It used to be,
    // because a configured-but-unreachable PostHog host made the `/ingest`
    // rewrite hammer a dead port until the server crashed mid-suite (libuv
    // assert) — a test-config workaround for a production availability bug.
    // `/ingest` is now a route handler that contains upstream failures as 502s
    // (see src/shared/analytics/ingest-proxy.ts), so the suite runs against the
    // real analytics configuration and would regress if that containment broke.
    command: isCI
      ? "NEXT_PUBLIC_API_MOCKING=enabled pnpm build && NEXT_PUBLIC_API_MOCKING=enabled pnpm start"
      : "pnpm dev:mock",
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !isCI,
  },
});
