---
name: testing-strategy
description: Use when writing or configuring unit tests, integration tests, or Playwright E2E. This repo splits Vitest into two projects (unit/integration) with deliberate setup differences, and E2E mocks the API with MSW (no Docker).
---

# Testing strategy

**Sources of truth:** [`docs/stack/vitest.md`](../../../docs/stack/vitest.md), [`docs/stack/testing-library.md`](../../../docs/stack/testing-library.md), [`docs/stack/playwright.md`](../../../docs/stack/playwright.md).

## Layout

| Command | Runs |
|---|---|
| `pnpm test` | `vitest run --project unit` (jsdom) |
| `pnpm test:integration` | `vitest run --project integration` (node, **no Docker** — MSW at the network boundary) |
| `pnpm e2e` | Playwright (Chromium), server via `pnpm dev:mock` |

File naming: unit `*.{test,spec}.{ts,tsx}`; integration `*.integration.{test,spec}.ts` (**not** `.tsx`).

## Load-bearing rules

- **Config uses `test.projects`, not the deprecated `test.workspace`.** Top-level plugins shared via `extends: true`.
- **The integration project has `setupFiles: []` on purpose** — it must NOT inherit the unit project's MSW `vitest.setup.ts`. Integration tests spin up their own `setupServer()` inline. Don't add `server.listen()` to any integration setup.
- **Co-locate unit tests** next to the module (FSD layer co-location). Keep E2E specs in `e2e/` at the root, not in `src/`.
- **Override handlers per-test** with `server.use(...)`; `server.resetHandlers()` in `afterEach`.
- **E2E selectors use accessible queries** — `getByLabel`, `getByRole`, `getByText` — never CSS classes or `data-testid` as the primary strategy. Use relative paths (`page.goto("/dashboard")`), not hardcoded `localhost:3000`.
- **Installing Playwright browsers on Arch/local:** `pnpm exec playwright install chromium` — do **not** pass `--with-deps` (it shells out to `apt-get`). Use `--with-deps` only on Debian/Ubuntu CI.
- **`e2e/global-setup.ts` is a no-op** — the MSW-mocked login accepts any credentials; new mock scenarios go in `src/shared/api/mocks/handlers.ts`.
