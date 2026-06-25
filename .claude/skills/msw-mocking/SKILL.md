---
name: msw-mocking
description: Use when editing mock handlers, instrumentation.ts, MswProvider, or anything under src/shared/api/mocks/. MSW runs in TWO places (browser worker + Next server runtime) and getting the wiring wrong lets requests escape to the real network.
---

# MSW (mock the external API)

**Source of truth:** [`docs/stack/msw.md`](../../../docs/stack/msw.md). All mocking is gated by `NEXT_PUBLIC_API_MOCKING=enabled`.

## Two runtimes, both required

| Where | File | Consumer |
|---|---|---|
| Browser worker | `src/shared/api/mocks/browser.ts` (`setupWorker`) | `MswProvider` (client) |
| Node server | `src/shared/api/mocks/node.ts` (`setupServer`) | `instrumentation.ts`, integration tests |

The **server** one mocks server-side fetches (e.g. the dashboard's `prefetchQuery`). `instrumentation.ts` must keep the `NEXT_RUNTIME === "nodejs"` guard, or it runs in Edge and breaks.

## Load-bearing rules

- **One handler file:** `src/shared/api/mocks/handlers.ts`. Build URLs with the `api()` helper (`new URL(path, env.NEXT_PUBLIC_API_URL)`) so they match ky — never hardcode URLs.
- **Don't cross the runtimes:** never import `browser.ts` in `instrumentation.ts` or tests; never call `worker.start()` in a Server Component. Use `node.ts` for all Node environments.
- **`MswProvider` gates children** behind a `ready` flag (`if (!ready) return null`) so no fetch fires before the worker is live.
- `msw` belongs in **`devDependencies`**, never `dependencies`.
- **`public/mockServiceWorker.js` is generated** (`npx msw init public/`) and Biome-ignored — don't hand-edit.

## Known gotcha

Turbopack HMR during `pnpm dev:mock` can drop the server-side global-`fetch` patch → `getaddrinfo ENOTFOUND`. Restart `dev:mock`. `next build` + `next start` is unaffected.
