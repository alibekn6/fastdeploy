# ky

**Version:** 2.0.2 (dependency)

## What & why

ky is a lightweight `fetch` wrapper with retry, timeout, typed JSON helpers, and a hook system. This repo uses it as the sole HTTP client for calls to the external API. A single configured instance (`http`) is created in `src/shared/api/http.ts` and shared by all entity queries and the auth feature.

## Conventions / rules

### Configured instance — `src/shared/api/http.ts`

```ts
export const http = ky.create({
  baseUrl: env.NEXT_PUBLIC_API_URL,
  credentials: "include",
  retry: { limit: 2 },
  timeout: 15_000,
  hooks: {
    beforeRequest: [
      // In mock mode the browser must not fetch before the MSW worker is live;
      // resolves immediately on the server and when mocking is disabled.
      () => mockWorkerReady().then(() => undefined),
      ({ request }) => request.headers.set("Accept", "application/json"),
    ],
    // Transparent 401 → refresh → retry.
    afterResponse: [createRefreshHook(redirectToLogin)],
  },
});
```

Both hooks are load-bearing. `mockWorkerReady()` is where the "no fetch before the MSW worker is live" invariant lives — it is deliberately **not** enforced by gating render in `MswProvider`, which would suppress the SSR body. The `afterResponse` refresh hook is not optional either: the route guard admits refresh-token-only sessions that every API call would otherwise 401.

**ky 2.x critical differences from ky 1.x / ky 0.x:**

- The base-origin option is **`baseUrl`**, NOT `prefixUrl`. ky 2.x throws if you pass `prefixUrl`.
- Request paths are passed **without a leading slash**: `users/${id}`, `posts`, `auth/login`. A leading slash breaks URL resolution under `baseUrl`.
- The `beforeRequest` hook signature is `({ request }) => ...` (destructured state object), not `(request) => ...`.

### Zod fetcher — `src/shared/api/fetcher.ts`

`getValidated` and `postValidated` call ky and then `schema.parse(json)`, validating the external API contract at the network boundary:

```ts
export async function getValidated<T>(path, schema, options?, client = http): Promise<T> {
  const json = await client.get(path, options).json<unknown>();
  return schema.parse(json); // throws ZodError on contract drift
}
```

Throwing on drift is intentional: it surfaces backend API changes immediately rather than letting bad data propagate into the UI.

**Swap point:** when the real API ships an OpenAPI spec, generate per-endpoint Zod schemas with `openapi-typescript` or `orval` and drop them in. The `http` client and fetcher functions stay unchanged — only the schemas change.

### Entity query factories

Entity modules wire `getValidated` into TanStack Query `queryOptions`:

- `src/entities/user/api/user-queries.ts` — `getValidated(\`users/${id}\`, UserSchema)`
- `src/entities/post/api/post-queries.ts` — `getValidated("posts", PostsSchema)`

This is the standard pattern: schema defined with the entity, query key factory alongside it, `queryOptions` exported for use in components.

### Auth usage

The auth feature uses `http` to call the external auth endpoints directly:

```ts
// src/features/auth/api/sign-in.ts
const json = await http.post("auth/login", { json: input }).json<unknown>();
const { mock_tokens } = unwrap(LoginEnvelopeSchema.parse(json));
if (mock_tokens) writeMockSessionCookies(mock_tokens);
const session = await queryClient.fetchQuery(sessionQueries.current());
```

No token is ever returned to JS in production — the response body carries only a message (the auth block's `{data}` envelope), and the session is established by the cookies the backend set. Session state then lives **only** in the `["session"]` query cache, primed by `auth/me`.

The external backend sets **two** Secure `httpOnly` cookies — `access_token` (short-lived) and `refresh_token` (30 days), both `SameSite=Lax; Path=/` (names exported from `src/shared/config/auth.ts`). `credentials: "include"` on `http` sends them back. In **mock mode only** (`NEXT_PUBLIC_API_MOCKING`), `src/features/auth/api/mock-session-cookies.ts` writes both via `document.cookie` — a Service Worker can't set httpOnly cookies, so mock responses carry token values in a `mock_tokens` body field (production responses never do). Those mock cookies are readable by JS and are not httpOnly or Secure.

### Transparent refresh — `src/shared/api/refresh-hook.ts`

`createRefreshHook` is the ky `afterResponse` hook wired into `http`. On a **401 from a non-auth route** it:

1. Issues a **single in-flight** `auth/refresh` via `sharedRefresh()`. Concurrent 401s await the same module-scoped promise (reset in `finally`), so the backend sees exactly one refresh per expiry burst. That promise resolves `true`/`false` and never rejects, because **both** refresh mechanisms share it — this hook and `refreshSessionQuietly()` (below), which disagree about what a failure means.
2. Retries the original request **once** via raw `fetch(request.clone())`. Raw fetch bypasses the hook, so a still-401 retry cannot recurse; the retried `Response` is returned to ky as final (`throwHttpErrors` runs after hooks, so callers parse the retried body).

The four token-lifecycle routes (`auth/login`, `auth/register`, `auth/refresh`, `auth/logout`) are **excluded** so refresh can't recurse; `auth/me` is excluded too, because its 401 is a session probe ("signed out" is a valid state, not a failure).

### The session probe's own refresh — `refreshSessionQuietly()`

Excluding `auth/me` from the hook is correct, but on its own it means an expired `access_token` with a live `refresh_token` renders as **signed out**: nothing refreshes proactively, so any user idle past the access-token TTL saw a "Sign in" header while still fully authenticated. `fetchSession()` (`src/entities/session/api/session-queries.ts`) therefore disambiguates a 401 by calling `refreshSessionQuietly()` **once** and re-reading `auth/me` **once**, falling back to `anonymousSession` otherwise. Cookie values are never inspected (they're httpOnly in production) — it's attempt-once-then-give-up, so a genuinely anonymous visitor spends exactly one extra 401.

That function **joins `sharedRefresh()`** rather than issuing its own `auth/refresh`: the same stale access token 401s the session probe and every data query in one burst, and two concurrent refreshes would, under refresh-token rotation, hand the loser a false 401 — escalating to a spurious logout + redirect for a live session. It takes **no** part in the escape: it resolves `false` and never redirects or logs out, which is what keeps an anonymous visitor on a public page from being bounced to `/login`.

If the refresh itself fails (e.g. server-side revocation), the escape fires **once per shared promise** — guarded on the promise's identity, not per awaiting caller — so N concurrent 401s produce exactly **one** `auth/logout` and **one** redirect to the localized login page. That logout is load-bearing: a failed refresh can leave an unexpired `access_token` behind, which the guard would read as live and bounce `/login` → `/dashboard` forever. Only the backend can delete an httpOnly cookie, and `auth/logout` clears both unconditionally (it performs no auth check). Transparent refresh invalidates **no** query keys — the user is unchanged, so preserving the cache is correct.

### MSW compatibility

MSW handlers build their interception URLs identically:

```ts
const api = (path: string) => new URL(path, env.NEXT_PUBLIC_API_URL).toString();
```

This mirrors how ky resolves `baseUrl + path`, so MSW intercepts ky requests correctly during dev and tests.

## ✅ Best practices

- Always use `getValidated` / `postValidated` from `src/shared/api/fetcher.ts` when you need a validated response — never call `http.get(...).json<MyType>()` directly in entity code (that skips runtime validation).
- Keep `http` as the single ky instance; do not create additional `ky.create()` calls for different parts of the app.
- Pass paths without a leading slash: `users/${id}`, not `/users/${id}`.
- Use `client` parameter overrides in `getValidated`/`postValidated` to inject a test-scoped ky instance in unit tests instead of relying on the global `http`.

## ❌ Worst practices / anti-patterns

- **Do not** use `prefixUrl` — ky 2.x throws. Use `baseUrl`.
- **Do not** add a leading slash to request paths — `"/users/1"` will resolve incorrectly under `baseUrl` (the base path is dropped).
- **Do not** write `hooks: { beforeRequest: [(req) => req.headers.set(...)] }` — in ky 2.x `beforeRequest` receives a state object; use `({ request }) => request.headers.set(...)`.
- **Do not** cast the response directly to a TypeScript type without parsing: `.json<User>()` is a type assertion only; it performs no runtime check. Use the Zod fetcher.
- **Do not** write the `access_token`/`refresh_token` cookies from client code outside mock mode — production relies on the backend's Secure `httpOnly` cookies; the client write (`mock-session-cookies.ts`) is gated by `NEXT_PUBLIC_API_MOCKING`.
- **Do not** bypass `http` with a raw `fetch` for API calls — you lose the transparent 401→refresh→retry and the mock-worker-ready gate. (The refresh hook's own internal `fetch` calls are deliberate: they must not recurse through the hook.)
- **Do not** add auth routes to the refresh path — `auth/login`, `auth/register`, `auth/refresh`, `auth/logout`, and `auth/me` must stay excluded, or a 401 recurses or bounces anonymous visitors off public pages.

## References

- ky README (includes 2.x migration notes): https://github.com/sindresorhus/ky
- ky 2.x changelog: https://github.com/sindresorhus/ky/releases
