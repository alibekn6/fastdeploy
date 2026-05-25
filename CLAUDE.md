# nextjs-frontend

Frontend Next.js 15 boilerplate on Feature-Sliced Design: consumes an **external** HTTP API (mocked with MSW in dev/test), with a thin httpOnly-cookie BFF for auth.

## Build and Test

- Install: `pnpm install` (Node 22; pnpm 11)
- Dev with mocks: `pnpm dev:mock` (sets `NEXT_PUBLIC_API_MOCKING=enabled`) · plain dev: `pnpm dev`
- Lint: `pnpm lint` · fix: `pnpm lint:fix` · CI lint: `pnpm ci` (Biome)
- FSD lint: `pnpm lint:fsd` (Steiger over `./src`)
- Type-check: `pnpm typecheck`
- Unit tests: `pnpm test` · Integration (MSW at the network boundary, **no Docker**): `pnpm test:integration` · E2E: `pnpm e2e`
- Build without env: `SKIP_ENV_VALIDATION=1 pnpm build`

## Conventions

- FSD layers, import only downward: `app → pages → widgets → features → entities → shared`. Same-layer cross-slice imports are forbidden **except** entity `@x` (example: `src/entities/user/@x/session.ts`, consumed only by `entities/session`).
- The Next App Router lives at the **root** `app/` as thin re-exports; FSD layers live under `src/` (including an FSD `src/app` with `providers/` + `styles/`).
- Each slice's public API is its `index.ts`. Use **named** re-exports — never `export *`.
- Shared config (`biome.json`, `steiger.config.ts`, `tsconfig.base.json`, `.nvmrc`, `commitlint.config.cjs`, `.husky/*`) is synced from the meta-repo's `tooling/shared/`; edit it there, not here.

## Gotchas

- pnpm 11 blocks dependency build scripts. `sharp` is allowed in `pnpm-workspace.yaml` (`allowBuilds`). **Why:** without it every `pnpm <script>` fails at `ERR_PNPM_IGNORED_BUILDS`; `package.json` `pnpm.onlyBuiltDependencies` is ignored by pnpm 11.
- ky 2.x: the HTTP client (`src/shared/api/http.ts`) uses **`baseUrl`** (NOT `prefixUrl` — ky 2.x throws on it); request paths are passed **without a leading slash** (`users/${id}`, `posts`). The `beforeRequest` hook receives a state object: `({ request }) => request.headers.set(...)`.
- MSW runs in **two** places, both gated by `NEXT_PUBLIC_API_MOCKING=enabled`: the browser worker (`MswProvider`, client) and the Next **server** runtime (`instrumentation.ts`). The server one is required so the server-side BFF call is mocked. `public/mockServiceWorker.js` is generated (Biome-ignored).
- Auth is a thin BFF: `src/features/auth/api/sign-in.ts` calls the **same-origin** `/api/auth/login` with `fetch` — NOT the external ky `http`. The BFF (`src/app/api-routes/auth.ts`) sets an httpOnly `SESSION_COOKIE`. It is the documented **single swap point** to Better Auth.
- `NEXT_PUBLIC_*` vars are inlined at **build** time → the Dockerfile build stage takes a `NEXT_PUBLIC_API_URL` ARG. `app/dashboard/page.tsx` is `force-dynamic` (prefetches the external API per request, avoiding a build-time fetch).

## Do Not

- Do not `export *` from an `index.ts`. Use named re-exports (Steiger + the public-API rule).
- Do not call the external ky `http` client for auth — auth goes through the same-origin BFF routes.
- Do not `git commit --no-verify`. The hook formats staged files; bypassing it makes `pnpm ci` (full-tree Biome) fail in CI.
- Do not add route files under the root `pages/` — it is an intentional empty placeholder that keeps Next from routing the FSD `src/pages` layer.

## Workflow

- Pre-commit hook runs `lint-staged` + `steiger ./src` + `tsc`. Commits are Conventional (lowercase subject); use `pnpm cz`.
- Before reporting done: `pnpm ci && pnpm lint:fsd && pnpm typecheck && pnpm test && pnpm test:integration && pnpm build`.
- Per-tool rules + best/worst practices live in `docs/stack/` — read the relevant file (esp. `msw.md`, `ky.md`, `bff-auth.md`) before changing that tool's setup.

---

# Behavioral guidelines

Reduce common LLM coding mistakes. **Tradeoff:** these bias toward caution over speed; for trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked; no abstractions for single-use code.
- No "flexibility"/"configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it. Ask: "Would a senior engineer say this is overcomplicated?"

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**
- Don't "improve" adjacent code, comments, or formatting; don't refactor what isn't broken; match existing style.
- Remove imports/variables YOUR changes orphaned; don't delete pre-existing dead code unless asked (mention it).
- The test: every changed line traces directly to the request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**
- "Add validation" → "write tests for invalid inputs, then make them pass".
- "Fix the bug" → "write a test that reproduces it, then make it pass".
- For multi-step tasks, state a brief plan with a verify step each, and loop until the criteria are met.
