---
name: ky-http-client
description: Use when editing src/shared/api/http.ts or fetcher.ts, adding calls to the external API, writing entity query factories, or touching MSW handler URLs. Covers the ky 2.x gotchas that silently break requests.
---

# ky HTTP client (external API)

**Source of truth:** [`docs/stack/ky.md`](../../../docs/stack/ky.md). `http` (`src/shared/api/http.ts`) is the single ky instance for the **external** API only.

## ky 2.x critical differences (these throw or misroute)

- Base origin is **`baseUrl`**, NOT `prefixUrl` — ky 2.x **throws** on `prefixUrl`.
- Request paths have **no leading slash**: `users/${id}`, `posts`, `auth/login`. A leading slash drops the base path.
- `beforeRequest` receives a **state object**: `({ request }) => request.headers.set(...)`, not `(request) => ...`.

## Load-bearing rules

- **Validate at the boundary.** Use `getValidated` / `postValidated` from `src/shared/api/fetcher.ts` (they `schema.parse(json)`). Never `http.get(...).json<MyType>()` in entity code — `.json<T>()` is a type assertion with no runtime check.
- **One ky instance.** Don't create extra `ky.create()` calls; reuse `http`.
- **MSW must match ky's URLs.** Handlers build URLs with `new URL(path, env.NEXT_PUBLIC_API_URL)` — mirror that, never hardcode.
- **Auth uses `http` directly** (`http.post("auth/login")` / `auth/refresh` / `auth/logout`): the external backend sets **two** Secure `httpOnly` `SameSite=Lax` cookies, `access_token` and `refresh_token` (`src/shared/config/auth.ts`). In mock mode only — gated by `NEXT_PUBLIC_API_MOCKING` — `mock-session-cookies.ts` writes both via `document.cookie` so `proxy.ts` can gate routes.
- **Both `http` hooks are load-bearing.** `beforeRequest` awaits `mockWorkerReady()` (the "no fetch before the MSW worker is live" invariant — never re-add a render gate in `MswProvider`). `afterResponse` runs `createRefreshHook`: one deduped in-flight `auth/refresh` per 401 burst, one raw-`fetch` retry, auth routes (incl. `auth/me`) excluded, and exactly one `auth/logout` + login redirect if the refresh fails. Don't bypass `http` with a raw `fetch` — you lose both.

## Verify

`pnpm typecheck` + the relevant unit/integration tests. For a seam audit (ky + MSW + cookie auth), dispatch the **`boundary-auditor`** subagent.
