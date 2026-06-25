---
name: env-validation
description: Use when adding or changing an environment variable, editing src/shared/config/env.ts, or reaching for process.env in app code. Env is validated at startup with @t3-oss/env-nextjs + Zod; unvalidated reads bypass the type-safe env object.
---

# Environment validation

**Source of truth:** [`docs/stack/env-validation.md`](../../../docs/stack/env-validation.md). Schema lives in `src/shared/config/env.ts`.

## This repo (frontend) uses strict `runtimeEnv`

It has both `server` and `client` blocks, so it uses **`runtimeEnv`** (not `experimental__runtimeEnv`). **Every key in `server:` and `client:` must also appear in `runtimeEnv`** — miss one and validation throws at boot.

## Load-bearing rules

- **Import `env` from `@/shared/config/env`** — never read `process.env.SOME_VAR` directly in app code (that skips Zod and gives you `string | undefined`).
- **`NEXT_PUBLIC_*` are inlined at build time** — compile-time constants. Changing them needs a rebuild; the Dockerfile build stage takes them as ARGs. Keep secrets out of `NEXT_PUBLIC_*` (they ship in the browser bundle).
- **Keep `emptyStringAsUndefined: true`** — CI injects empty strings for unset vars, which would otherwise pass `z.string()`.
- **`skipValidation: !!process.env.SKIP_ENV_VALIDATION`** — set `SKIP_ENV_VALIDATION=1` in Docker/CI build steps without a populated env (e.g. `SKIP_ENV_VALIDATION=1 pnpm build`).
- **After adding a var:** add it to `server`/`client` AND `runtimeEnv`, then to `.env.example` with a safe placeholder.
