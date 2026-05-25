# GitHub Actions

## What & why

Each boilerplate has its own per-repo CI workflow (`.github/workflows/ci.yml`) that runs on every
push to `main` and on every pull request. The META-repo (`frontend/`) has a separate
`tooling-sync.yml` workflow that guards against configuration drift between the two boilerplates.
This split is intentional: per-repo CI validates application correctness; the META-repo workflow
validates that shared tooling config has not diverged.

Pinned versions: `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`,
Node 22, pnpm 11.3.

## Conventions / rules

**Per-repo CI — shared steps (both A and B)**

```yaml
on: { push: { branches: [main] }, pull_request: {} }
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm ci           # biome ci (full-tree format + lint check)
      - run: pnpm lint:fsd     # steiger ./src (FSD architecture rules)
      - run: pnpm typecheck    # tsc --noEmit
      - run: pnpm test         # vitest unit
      - run: pnpm test:integration
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm e2e
```

`pnpm ci` runs `biome ci` (read-only, exits non-zero on violations). This is the full-tree check
that lint-staged cannot perform on staged files alone.

**A only (`nextjs-fullstack`) — postgres service + DB steps**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    env: { POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres, POSTGRES_DB: app }
    ports: ["5432:5432"]
    options: >-
      --health-cmd "pg_isready -U postgres" --health-interval 2s
      --health-timeout 5s --health-retries 10
env:
  DATABASE_URL: postgres://postgres:postgres@localhost:5432/app
  BETTER_AUTH_SECRET: ci-secret-ci-secret-ci-secret-12345
  BETTER_AUTH_URL: http://localhost:3000
  GITHUB_CLIENT_ID: x
  GITHUB_CLIENT_SECRET: x
```

Additional steps inserted between `typecheck` and `test`:
```yaml
- run: pnpm db:migrate
# ... (test steps) ...
- run: pnpm db:seed
- run: pnpm e2e
```

`pnpm test:integration` uses Testcontainers, which spins up its own ephemeral Postgres containers
inside the runner (Docker is present on `ubuntu-latest`). The `services.postgres` is used by the
app during e2e tests.

**B only (`nextjs-frontend`) — MSW mocking, no services**

```yaml
env:
  NEXT_PUBLIC_API_URL: https://api.example.com
  NEXT_PUBLIC_API_MOCKING: enabled
```

No `services` block. All network calls are intercepted by MSW. There is no `db:migrate` or
`db:seed` step.

**META-repo tooling-sync workflow**

```yaml
# .github/workflows/tooling-sync.yml
on:
  push: { paths: ["tooling/**"] }
  pull_request: { paths: ["tooling/**"] }
  schedule: [{ cron: "0 6 * * 1" }]   # weekly drift sweep
jobs:
  check:
    steps:
      - uses: actions/checkout@v4          # checks out the META-repo
      - uses: actions/checkout@v4
        with: { repository: "${{ vars.NEXTJS_FULLSTACK_REPO }}", path: nextjs-fullstack, token: "${{ secrets.SYNC_TOKEN }}" }
      - uses: actions/checkout@v4
        with: { repository: "${{ vars.NEXTJS_FRONTEND_REPO }}", path: nextjs-frontend, token: "${{ secrets.SYNC_TOKEN }}" }
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: node tooling/sync.mjs --check
```

`node tooling/sync.mjs --check` byte-compares every file listed in `tooling/manifest.json` between
`tooling/shared/` and each repo checkout. If any file differs, it prints `DRIFT: <repo>/<path>` and
exits 1. The workflow runs on every `tooling/**` push, every PR touching tooling, and as a weekly
cron sweep (Mondays at 06:00 UTC) to catch any out-of-band edits in the boilerplate repos.

The per-repo CI workflows do NOT run `tooling/sync.mjs --check` because a standalone boilerplate
clone has no `tooling/` directory. Drift enforcement is exclusively the META-repo's responsibility.

**Required secrets / vars for tooling-sync**

| Name | Kind | Purpose |
|------|------|---------|
| `SYNC_TOKEN` | Secret | PAT with `repo` read scope for checking out boilerplate repos |
| `NEXTJS_FULLSTACK_REPO` | Variable | `org/nextjs-fullstack` |
| `NEXTJS_FRONTEND_REPO` | Variable | `org/nextjs-frontend` |

## ✅ Best practices

- Keep `pnpm install --frozen-lockfile` in CI — never omit `--frozen-lockfile` in automated
  environments.
- Run `biome ci` (not `biome check --write`) in CI — `--write` would modify files silently and
  produce a misleading green build.
- Edit shared tooling config only in `tooling/shared/`, then run `node tooling/sync.mjs` to
  propagate changes to both repos before opening a PR.
- The `SYNC_TOKEN` PAT needs only read access to the boilerplate repos for the `--check` mode.

## ❌ Worst practices / anti-patterns

- **Do not edit shared config files directly in a boilerplate repo** — `tooling-sync.yml` will
  report DRIFT on the next run and the PR will fail.
- Do not add `pnpm install` without `--frozen-lockfile` in CI — it can silently update the lockfile
  and mask version mismatches.
- Do not skip `pnpm lint:fsd` in CI — it is the only place where FSD cross-layer import violations
  are caught in the full tree (steiger does not run in the pre-commit hook's scope of a single file).
- Do not pin `actions/setup-node` below v4 — earlier versions do not support the `cache: pnpm`
  shorthand.

## References

- https://docs.github.com/en/actions/writing-workflows (GitHub Actions docs)
- https://github.com/pnpm/action-setup (pnpm/action-setup)
- https://playwright.dev/docs/ci-intro (Playwright CI guide)
- https://node.testcontainers.org/ (Testcontainers for Node.js)
