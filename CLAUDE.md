# nextjs-frontend

Frontend Next.js 16 boilerplate on Feature-Sliced Design: consumes an **external** HTTP API (mocked with MSW in dev/test); auth calls that API directly and the backend sets a Secure httpOnly session cookie.

> **Before changing any tool's setup, use the skills and subagents.** The matching skill in `.claude/skills/` (`fsd-architecture`, `msw-mocking`, `ky-http-client`, `env-validation`, `tanstack-query`, `testing-strategy`, `i18n`, `storybook`, `posthog`, `seo`) auto-loads that area's rules and links the authoritative `docs/stack/<tool>.md` — read the doc before non-trivial changes. After structural (`src/`) or API/auth changes and before committing, dispatch the matching review subagent: **`fsd-compliance`** (FSD layers/public-API/`@x`), **`boundary-auditor`** (ky/MSW/cookie-auth seam), or **`ui-quality`** (Storybook/i18n/SEO-metadata seam).

## Build and Test

- Install: `pnpm install` (Node 22; pnpm 11)
- Dev with mocks: `pnpm dev:mock` (sets `NEXT_PUBLIC_API_MOCKING=enabled`) · plain dev: `pnpm dev`
- Lint: `pnpm lint` · fix: `pnpm lint:fix` · CI lint: `pnpm lint:ci` (Biome)
- FSD lint: `pnpm lint:fsd` (Steiger over `./src`)
- Type-check: `pnpm typecheck`
- Unit tests: `pnpm test` · Integration (MSW at the network boundary, **no Docker**): `pnpm test:integration` · E2E: `pnpm e2e`
- Storybook: `pnpm storybook` (dev workshop) · `pnpm build-storybook` · `pnpm test-storybook` (stories as Vitest browser tests). These scripts set `NEXT_PUBLIC_API_URL` because the preview imports the MSW handlers.
- Build without env: `SKIP_ENV_VALIDATION=1 pnpm build`
- Locales: `en` (default, unprefixed), `ru`, `kk` (Kazakh). The CI/full-tree lint gate is `pnpm lint:ci` (Biome over the whole tree, including `docs/` and JSON).

## Conventions

- FSD layers, import only downward: `app → pages → widgets → features → entities → shared`. Same-layer cross-slice imports are forbidden **except** entity `@x` (example: `src/entities/user/@x/session.ts`, consumed only by `entities/session`).
- The Next App Router lives at the **root** `app/` as thin re-exports; FSD layers live under `src/` (including an FSD `src/app` with `providers/` + `styles/`).
- Each slice's public API is its `index.ts`. Use **named** re-exports — never `export *`.
- Shared config (`biome.json`, `steiger.config.ts`, `tsconfig.base.json`, `.nvmrc`, `commitlint.config.cjs`, `.husky/*`) is synced from the meta-repo's `tooling/shared/`; edit it there, not here.
- Local deviation to upstream: `biome.json` was adjusted here (`$schema` → 2.5.1 and a `!**/globals.css` exclude for Tailwind v4 entry CSS); upstream these to the meta-repo's `tooling/shared/`.

## Gotchas

- pnpm 11 blocks dependency build scripts. `sharp` is allowed in `pnpm-workspace.yaml` (`allowBuilds`). **Why:** without it every `pnpm <script>` fails at `ERR_PNPM_IGNORED_BUILDS`; `package.json` `pnpm.onlyBuiltDependencies` is ignored by pnpm 11.
- ky 2.x: the HTTP client (`src/shared/api/http.ts`) uses **`baseUrl`** (NOT `prefixUrl` — ky 2.x throws on it); request paths are passed **without a leading slash** (`users/${id}`, `posts`). The `beforeRequest` hook receives a state object: `({ request }) => request.headers.set(...)`.
- MSW runs in **two** places, both gated by `NEXT_PUBLIC_API_MOCKING=enabled`: the browser worker (`MswProvider`, client) and the Next **server** runtime (`instrumentation.ts`). The server one is required so server-side fetches (e.g. the `app/dashboard` prefetch) are mocked. `public/mockServiceWorker.js` is generated (Biome-ignored).
- Auth calls the external API directly via the ky `http` client (`http.post("auth/login")`/`auth/logout`); the **backend** sets the Secure httpOnly `SESSION_COOKIE`, which `proxy.ts` presence-checks to gate `/dashboard`. The cookie must land on the app's origin (same-site / shared registrable domain) or the proxy and SSR can't read it. In **mock mode only** (`NEXT_PUBLIC_API_MOCKING`), `sign-in.ts`/`header.tsx` set a readable `session` cookie via `document.cookie` because a Service Worker (MSW in the browser) cannot set httpOnly cookies.
- `NEXT_PUBLIC_*` vars are inlined at **build** time → the Dockerfile build stage takes a `NEXT_PUBLIC_API_URL` ARG. `app/[locale]/dashboard/page.tsx` is `force-dynamic` (prefetches the external API per request, avoiding a build-time fetch).
- i18n (next-intl): routes live under `app/[locale]` (locales `en`/`ru`/`kk`, `localePrefix: "as-needed"` → `en` unprefixed). `proxy.ts` runs the cookie auth gate **first** (stripping a leading `/ru|/kk`), then hands off to `createMiddleware(routing)`; the matcher must stay site-wide. Every static page/layout needs `await params` + `setRequestLocale(locale)`.
- Storybook is **10** (not 9) on `@storybook/nextjs-vite` (Vite builder, required by the Vitest addon); a third `storybook` Vitest project runs stories as browser tests via `provider: playwright()` (the factory, not the `'playwright'` string). The `storybook`/`build-storybook`/`test-storybook` scripts **set `NEXT_PUBLIC_API_URL`** because `preview.tsx` imports the MSW `handlers` → validated env.
- PostHog is **optional**: unset `NEXT_PUBLIC_POSTHOG_KEY` ⇒ no-op (provider passthrough + helpers guard on `analyticsConfigured()`). Events go through the same-origin `/ingest` reverse-proxy rewrites (`next.config.ts` + `skipTrailingSlashRedirect`); consent is opt-out-by-default; manual `$pageview` (Suspense-wrapped `useSearchParams`).
- SEO: `robots.ts`/`sitemap.ts`/`opengraph-image.tsx` must be **real files** in `app/`; `themeColor`/`colorScheme` live in the `viewport` export (not `metadata`); canonical/hreflang come from `src/shared/config/seo.ts`. `SITE_URL` keeps a `?? "http://localhost:3000"` fallback so `SKIP_ENV_VALIDATION=1 pnpm build` doesn't crash on `new URL(undefined)`.

## Do Not

- Do not `export *` from an `index.ts`. Use named re-exports (Steiger + the public-API rule).
- Do not write the `session` cookie from client code outside mock mode — in production the backend sets it (Secure, httpOnly); the client write is gated by `NEXT_PUBLIC_API_MOCKING`.
- Do not `git commit --no-verify`. The hook formats staged files; bypassing it makes `pnpm lint:ci` (full-tree Biome) fail in CI.
- Do not add route files under the root `pages/` — it is an intentional empty placeholder that keeps Next from routing the FSD `src/pages` layer.

## Workflow

- Pre-commit hook runs `lint-staged` + `steiger ./src` + `tsc`. Commits are Conventional (lowercase subject); use `pnpm cz`.
- Before reporting done: `pnpm lint:ci && pnpm lint:fsd && pnpm typecheck && pnpm test && pnpm test:integration && pnpm build`.
- Use the per-feature skills + review subagents before changing a tool's setup (see the note at the top). Authoritative per-tool rules live in `docs/stack/`.

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


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
