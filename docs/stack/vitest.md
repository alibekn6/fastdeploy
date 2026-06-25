# Vitest

**Pinned:** `vitest` 4.1.9, `@vitest/coverage-v8` 4.1.9, `@vitejs/plugin-react` 6.0.3, `jsdom` (bundled with Vitest). Tsconfig `@/*` paths resolve via Vite 8's native `resolve.tsconfigPaths` — no `vite-tsconfig-paths` plugin.

## What & why

Vitest is the unit and integration test runner for both boilerplates. It runs inside the same Vite pipeline as the app, which means `@/*` path aliases, TypeScript, and JSX work without extra transpilation config. A single `vitest.config.ts` at the repo root drives two named projects — `unit` and `integration` — keeping both concerns in one file without the deprecated `workspace` API.

## Conventions / rules

**Config — `test.projects`, not `workspace`:**
Both `nextjs-fullstack/vitest.config.ts` and `nextjs-frontend/vitest.config.ts` define two inline project objects under `test.projects`. The top-level plugins (`tsconfigPaths()`, `react()`) are shared via `extends: true` in each project.

```ts
// vitest.config.ts (identical shape in A and B)
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          exclude: ["src/**/*.integration.{test,spec}.ts"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.integration.{test,spec}.ts"],
          hookTimeout: 120_000,
          testTimeout: 60_000,
          pool: "forks",
          setupFiles: [],
        },
      },
    ],
  },
});
```

B also adds `envPrefix: ["NEXT_PUBLIC_", "NODE_"]` to expose those env vars inside tests.

**Why `setupFiles: []` on the integration project:**
The `unit` project's `vitest.setup.ts` starts an MSW node server. The integration project must NOT inherit that setup because (A) MSW would intercept Docker/Testcontainers' own HTTP control traffic, breaking container lifecycle calls, and (B) B's integration tests spin up their own MSW server inline. An empty `setupFiles: []` is an explicit opt-out, not an accidental omission.

**A has a separate `vitest.setup.integration.ts`:**
`nextjs-fullstack/vitest.setup.integration.ts` contains only a comment documenting the no-MSW decision. It is not listed in `setupFiles` because the integration project uses `setupFiles: []` — it exists as documentation, not as a loaded file.

**`@/*` alias in tests:**
Vite 8's native `resolve.tsconfigPaths: true` (in `vitest.config.ts`) reads `compilerOptions.paths` from `tsconfig.json`, so `import { db } from "@/shared/api/db"` works inside test files without any extra alias mapping. (Requires vitest ≥ 4.1.9; earlier 4.1.x did not apply it in the test env — vitest #10054.)

**Scripts:**

| Command | What runs |
|---|---|
| `pnpm test` | `vitest run --project unit` |
| `pnpm test:integration` | `vitest run --project integration` |
| `pnpm test:coverage` | `vitest run --coverage` (v8, all projects) |

Coverage outputs `text`, `html`, and `lcov` reports and covers `src/**` excluding test files and `.d.ts`.

**A vs B — integration project differences:**

| | A (fullstack) | B (frontend) |
|---|---|---|
| Integration strategy | Testcontainers (`postgres:17-alpine`) + Drizzle migrations | MSW at the network boundary (node env, no Docker) |
| Requires Docker | Yes | No |
| `setupFiles` | `[]` | `[]` |
| Key test files | `post-repo.integration.test.ts`, `auth-flow.integration.test.ts` | `fetcher.integration.test.ts`, `auth.integration.test.ts` |

**File naming convention:**
Unit tests: `*.{test,spec}.{ts,tsx}`. Integration tests: `*.integration.{test,spec}.ts` (note: `.tsx` is not matched by the integration include glob — integration tests are Node-environment logic, not component rendering).

## Best practices

- Put unit tests next to the module they cover (`session.test.ts` beside `session.ts`) following FSD layer co-location.
- Override handlers per-test with `server.use(http.get(...))` inside the test body; `server.resetHandlers()` in `afterEach` (already wired in `vitest.setup.ts`) will clean them up.
- Keep integration test files in the same FSD segment as the code they exercise (`src/shared/api/db/testing/pg-container.ts` is in `shared`, tests for the posts repo are in `entities/post/api/`).
- Use `pool: "forks"` for integration tests — this isolates module registries between test files, which matters when `auth-flow.integration.test.ts` sets `process.env.DATABASE_URL` before dynamically importing the auth module.

## Anti-patterns

- **Do not** use the deprecated `test.workspace` key — use `test.projects` inline objects.
- **Do not** add MSW `server.listen()` to any integration setup file; the integration environment must have a clean network so real HTTP calls (to containers or to `next/headers` mocks) go through unintercepted.
- **Do not** import `@/shared/api/auth` at the top level of `auth-flow.integration.test.ts` — the `DATABASE_URL` env var must be set before that module is imported or Better Auth will initialize with the wrong connection string. Use `await import(...)` inside `beforeAll`.
- **Do not** add `.tsx` to the integration `include` pattern — integration tests are pure TypeScript logic and should not render React components.
- **Do not** run `pnpm test:integration` without Docker running (A) — the `@testcontainers/postgresql` container will fail to start.

## References

- https://vitest.dev/guide/workspace
- https://vitest.dev/config/#projects
- https://vitest.dev/guide/coverage
