# pnpm

## What & why

pnpm 11 is the package manager for both boilerplates. It installs faster than npm/yarn, uses a
content-addressable store to deduplicate packages across projects, and produces a strict
`node_modules` layout that prevents phantom dependency bugs. Node is pinned to 22 via `.nvmrc`;
pnpm is activated through corepack (no global install required).

Pinned version: `pnpm@11.3`.

## Conventions / rules

**Node version — `.nvmrc`**

```
22
```

Switch with `nvm use` or `fnm use`. CI and Docker both use `node:22` / `node-version: 22`.

**pnpm via corepack**

No global `pnpm` install is required. Enable once:

```bash
corepack enable
```

After that, `pnpm` resolves to the version declared in `package.json`'s `packageManager` field (or
the latest stable if absent). Docker does the same with `RUN corepack enable` in the `base` stage.

**Critical: `pnpm-workspace.yaml` and `allowBuilds`**

pnpm 11 blocks all dependency build scripts (postinstall hooks that compile native binaries) by
default. This boilerplate whitelists the required ones in `pnpm-workspace.yaml`:

```yaml
# pnpm blocks dependency build scripts by default.
allowBuilds:
  cpu-features: true
  esbuild: true
  msw: true
  protobufjs: true
  sharp: true
  ssh2: true
```

**This must be configured in `pnpm-workspace.yaml`, NOT in `package.json`.**

pnpm 11 ignores `pnpm.onlyBuiltDependencies` in `package.json` and logs a warning. If you move
this config to `package.json`, every `pnpm <script>` will fail with:

```
ERR_PNPM_IGNORED_BUILDS  The following dependencies have build scripts that are ignored:
  sharp, esbuild, ...
```

Without `sharp` allowed, Next.js image optimisation is broken. Without `esbuild`, several build
tools fail silently or loudly. `msw`, `protobufjs`, `cpu-features`, and `ssh2` are indirect
dependencies that also need postinstall scripts.

**`pnpm-workspace.yaml` must be present in Docker's `deps` stage.** The `Dockerfile` copies it
alongside `package.json` and `pnpm-lock.yaml`:

```dockerfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
```

Without this copy, Docker's `pnpm install` runs without the `allowBuilds` config and crashes.

**Key scripts**

| Script | What it runs |
|--------|-------------|
| `pnpm dev` | `next dev --turbopack` (local dev, fast refresh) |
| `pnpm dev:mock` | B only — same + `NEXT_PUBLIC_API_MOCKING=enabled` |
| `pnpm build` | `next build` |
| `pnpm ci` | `biome ci` (full-tree, read-only lint/format check) |
| `pnpm lint:fsd` | `steiger ./src` (FSD architecture rules) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm cz` | Interactive conventional commit prompt |
| `pnpm prepare` | `husky` (installs Git hooks) |
| `pnpm test` | `vitest run --project unit` |
| `pnpm test:integration` | `vitest run --project integration` |
| `pnpm e2e` | `playwright test` |
| `pnpm db:generate` | A only — `drizzle-kit generate` |
| `pnpm db:migrate` | A only — `drizzle-kit migrate` |
| `pnpm db:seed` | A only — `tsx src/shared/api/db/seed.ts` |

**Tooling sync — editing shared config**

Several config files (`commitlint.config.cjs`, `.husky/pre-commit`, `.husky/commit-msg`, etc.) are
shared between both boilerplates and managed from the META-repo. Do not edit them directly inside
`nextjs-fullstack/` or `nextjs-frontend/`. Instead:

1. Edit the file in `/home/yernur/Projects/frontend/tooling/shared/<path>`.
2. Run from the META-repo root:
   ```bash
   node tooling/sync.mjs
   ```
   This copies each file from `tooling/shared/` to both boilerplate repos.
3. Commit and push in both repos.

The full list of synced files is in `tooling/manifest.json`. Running `node tooling/sync.mjs --check`
(what the `tooling-sync.yml` CI workflow does) byte-compares each file and exits non-zero if any
drift is detected.

## ✅ Best practices

- Always use `--frozen-lockfile` in CI and Docker to guarantee reproducible installs.
- Keep `allowBuilds` in `pnpm-workspace.yaml`; do not move it to `package.json`.
- Copy `pnpm-workspace.yaml` in the Docker `deps` stage alongside the lockfile.
- Use `pnpm dlx <pkg>` for one-off executions (e.g. `pnpm dlx shadcn add button`) rather than
  installing dev tools globally.
- Use `nvm use` / `fnm use` to ensure you are on Node 22 before running any scripts locally.

## ❌ Worst practices / anti-patterns

- **Do not put `pnpm.onlyBuiltDependencies` in `package.json`** — pnpm 11 ignores it and the
  silent failure manifests as broken builds.
- **Do not omit `pnpm-workspace.yaml` from the Docker `deps` COPY line** — `pnpm install` will
  fail with `ERR_PNPM_IGNORED_BUILDS`.
- Do not run `pnpm install` without `--frozen-lockfile` in Docker or CI — it can silently update
  the lockfile.
- Do not edit synced config files directly inside a boilerplate repo — use the META-repo
  `tooling/sync.mjs` workflow.
- Do not install pnpm globally via npm if corepack is available — corepack pins the exact version.

## References

- https://pnpm.io/cli/install (pnpm install flags)
- https://pnpm.io/npmrc#onlybuiltdependencies (allowBuilds / build scripts)
- https://pnpm.io/workspaces (workspace config)
- https://github.com/nodejs/corepack (corepack)
- https://nodejs.org/en/download/ (Node.js 22 LTS)
