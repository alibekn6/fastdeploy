# ky

**Version:** 2.0.2 (dependency)

## What & why

ky is a lightweight `fetch` wrapper with retry, timeout, typed JSON helpers, and a hook system. This repo uses it as the sole HTTP client for calls to the external API. A single configured instance (`http`) is created in `src/shared/api/http.ts` and shared by all entity queries and the BFF auth handlers.

## Conventions / rules

### Configured instance — `src/shared/api/http.ts`

```ts
export const http = ky.create({
  baseUrl: env.NEXT_PUBLIC_API_URL,
  credentials: "include",
  retry: { limit: 2 },
  timeout: 15_000,
  hooks: { beforeRequest: [({ request }) => request.headers.set("Accept", "application/json")] },
});
```

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

### BFF auth usage

`src/app/api-routes/auth.ts` also uses `http` to call the external auth endpoint:

```ts
const data = await http.post("auth/login", { json: body }).json<{ token: string }>();
```

Note: the sign-in feature (`src/features/auth/api/sign-in.ts`) calls the same-origin BFF route via plain `fetch("/api/auth/login")` — it does NOT use `http` directly. `http` is for external API calls only.

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
- **Do not** call the external API `http` from client-side auth code — auth flows must go through the BFF (`/api/auth/*`) to keep tokens server-side.

## References

- ky README (includes 2.x migration notes): https://github.com/sindresorhus/ky
- ky 2.x changelog: https://github.com/sindresorhus/ky/releases
