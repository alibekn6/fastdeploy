# Environment Validation

**Pinned:** `@t3-oss/env-nextjs` 0.13.11

## What & why

`@t3-oss/env-nextjs` validates environment variables at startup using Zod schemas and makes them available as a typed `env` object. It catches misconfiguration before a request is ever served — a missing `DATABASE_URL` crashes loudly at boot, not silently mid-request. Both boilerplates share the same conventions but use different `createEnv` options because their variable sets differ.

## Conventions / rules

**Location:** `src/shared/config/env.ts` in both boilerplates.

**Common options (both A and B):**
```ts
emptyStringAsUndefined: true,
skipValidation: !!process.env.SKIP_ENV_VALIDATION,
```
`emptyStringAsUndefined` treats `VAR=` the same as a missing var. `SKIP_ENV_VALIDATION=1` is set in CI/build scripts where env vars may not be populated.

---

**A (fullstack) — server-only vars, `experimental__runtimeEnv`:**

```ts
// src/shared/config/env.ts  (A)
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
  },
  experimental__runtimeEnv: { NODE_ENV: process.env.NODE_ENV },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
```

A has no `client:` block because it is a fullstack app — there are no `NEXT_PUBLIC_*` variables. The `experimental__runtimeEnv` option is the Next.js-specific variant: server vars are read automatically from `process.env`, so only `NODE_ENV` (which Next.js injects rather than auto-exposing) needs to be listed explicitly. The `.env.example` for A is:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/app
BETTER_AUTH_SECRET=replace-with-32+char-random-string-000000
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
```

---

**B (frontend) — mixed server + client vars, `runtimeEnv`:**

```ts
// src/shared/config/env.ts  (B)
export const env = createEnv({
  server: { NODE_ENV: z.enum(["development", "production", "test"]).default("development") },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_API_MOCKING: z.enum(["enabled", "disabled"]).default("disabled"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
```

B uses the strict `runtimeEnv` (not `experimental__runtimeEnv`) because it has both `server` and `client` vars. With `experimental__runtimeEnv` you can only list client/shared keys — you cannot declare server-side `NODE_ENV` there. Every key in `server:` and `client:` must appear in `runtimeEnv`. The `.env.example` for B is:

```
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_API_MOCKING=disabled
```

**`NEXT_PUBLIC_*` are inlined at build time.** Next.js replaces them statically during compilation. Changing them after a build requires a rebuild — they are not read from `process.env` at runtime.

**CLI tools (drizzle-kit, etc.) do not auto-load `.env`.** Run `dotenv -- drizzle-kit ...` or configure a `.env` loader in the tool's config.

## Best practices

- Import `env` from `@/shared/config/env` rather than reading `process.env` directly — type safety and validation only apply through the `env` object.
- Set `SKIP_ENV_VALIDATION=1` in Dockerfiles and CI steps that build Next.js without a fully populated environment.
- Keep secrets out of `NEXT_PUBLIC_*`; they are visible in the browser bundle.
- After adding a new var, add it to `.env.example` with a safe placeholder value.

## Anti-patterns

- **Do not** read `process.env.SOME_VAR` directly in application code — unvalidated reads bypass Zod and produce `string | undefined` instead of `string`.
- **Do not** use `experimental__runtimeEnv` when you have a `client:` block (B's case) — list every key in `runtimeEnv` instead.
- **Do not** commit real secrets to `.env.example`; use placeholder strings.
- **Do not** expect `NEXT_PUBLIC_*` changes to take effect without rebuilding — they are compile-time constants.
- **Do not** skip `emptyStringAsUndefined: true` — CI often injects empty strings for unset vars, which would otherwise pass `z.string()` validation.

## References

- https://env.t3.gg/docs/nextjs
- https://env.t3.gg/docs/recipes#skip-validation
- https://nextjs.org/docs/app/guides/environment-variables
