# Playwright

**Pinned:** `@playwright/test` 1.60.0

## What & why

Playwright runs end-to-end tests against the real Next.js application in a Chromium browser. It is the only layer that verifies routing (proxy redirects, cookie-gated pages), the server/client boundary, and full user flows. Both boilerplates share the same spec structure — unauth redirect, login → dashboard → logout, post list — but differ fundamentally in how the server gets its data: A uses a real Postgres database seeded via `global-setup.ts`, B uses MSW to mock every API call at the network boundary.

## Conventions / rules

**`playwright.config.ts` — shared shape:**

```ts
// playwright.config.ts (both boilerplates)
const isCI = !!process.env.CI;
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "html",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { ... },
});
```

Only `webServer.command` differs between A and B (see below). `reuseExistingServer: !isCI` means a locally running dev server is reused; CI always starts fresh.

**A vs B — server strategy:**

| | A (fullstack) | B (frontend) |
|---|---|---|
| Local dev command | `pnpm dev` | `pnpm dev:mock` (`NEXT_PUBLIC_API_MOCKING=enabled next dev --turbopack`) |
| CI command | `pnpm build && pnpm start` | `NEXT_PUBLIC_API_MOCKING=enabled pnpm build && NEXT_PUBLIC_API_MOCKING=enabled pnpm start` |
| Data source | Real Postgres (must be running) | MSW handlers (`src/shared/api/mocks/handlers.ts`) |
| `global-setup.ts` | POSTs to `/api/auth/sign-up/email` to seed the test user | No-op (`// MSW-mocked login accepts any credentials`) |
| `instrumentation.ts` | Not present | Starts MSW node server when `NEXT_PUBLIC_API_MOCKING=enabled` so server-side fetches are mocked |

**A's `global-setup.ts` — retry loop:**
`nextjs-fullstack/e2e/global-setup.ts` retries the sign-up POST up to 15 times (2 s delay) because Next.js with Turbopack compiles routes lazily — the auth route may not be ready immediately after the server reports "ready". A `< 500` status (including 4xx for "user already exists") is treated as success.

**B's MSW server runtime:**
`nextjs-frontend/instrumentation.ts` calls `server.listen({ onUnhandledRequest: "bypass" })` when `NEXT_RUNTIME === "nodejs"` and `NEXT_PUBLIC_API_MOCKING === "enabled"`. This intercepts outgoing `fetch` calls made by server components (e.g. the dashboard prefetch), so E2E tests never need a real API backend.

**Spec files — `e2e/` directory (same names in both):**

| File | What it covers |
|---|---|
| `e2e/auth.spec.ts` | Unauth `/dashboard` → redirect to `/login`; login → dashboard → logout flow |
| `e2e/posts.spec.ts` | A: creates a post via form, asserts it appears in the list. B: asserts the MSW-seeded "First" post is visible after login. |

Selectors use accessible queries: `page.getByLabel("Email")`, `page.getByRole("button", { name: /sign in/i })`, `page.getByText("First")`.

**Installing browsers:**

```bash
# Arch Linux / local (system Chromium libraries present)
pnpm exec playwright install chromium

# Debian/Ubuntu CI
pnpm exec playwright install chromium --with-deps
```

Do not pass `--with-deps` on Arch — it attempts `apt-get` and will error.

**Running E2E:**

```bash
pnpm e2e             # run all specs (starts server automatically)
pnpm e2e --ui        # interactive Playwright UI
pnpm e2e --headed    # watch the browser
```

## Best practices

- Keep specs in `e2e/` at the project root, not inside `src/`. E2E tests exercise the deployed app, not module internals.
- Use `page.getByLabel` and `page.getByRole` — they are resilient to layout changes and double as accessibility audits.
- Keep `global-setup.ts` minimal. A's setup only creates the test user; it does not log in or store auth state. Authentication is done inline in each spec so test isolation is preserved.
- In B, add new mock scenarios to `src/shared/api/mocks/handlers.ts` — they will be picked up by unit tests, integration tests, dev mode, and E2E automatically.
- Use `trace: "on-first-retry"` (already set) to get a trace archive on CI failures without the overhead of recording every run.

## Anti-patterns

- **Do not** run A's E2E tests without a running Postgres instance — `global-setup.ts` will fail at the sign-up call.
- **Do not** set `NEXT_PUBLIC_API_MOCKING=enabled` for A — A's fullstack app talks directly to the DB and has no MSW layer; setting that env var has no effect but signals confusion about which boilerplate you are in.
- **Do not** use `page.locator(".some-class")` or `page.locator("[data-testid=...]")` as the primary selector strategy — prefer accessible roles and labels.
- **Do not** share mutable state between specs via module-level variables — each `test(...)` should be independent. For auth state, log in inside the test or use Playwright's `storageState` fixture.
- **Do not** hardcode `http://localhost:3000` inside specs — use relative paths (`page.goto("/dashboard")`) so `baseURL` from config applies.
- **Do not** add `--with-deps` to the `playwright install` call on Arch Linux/local machines — it will fail because `apt-get` is not available.

## References

- https://playwright.dev/docs/test-configuration
- https://playwright.dev/docs/webserver
- https://playwright.dev/docs/global-setup-teardown
