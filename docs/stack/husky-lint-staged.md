# Husky + lint-staged

## What & why

Husky v9 installs Git hooks as plain shell scripts (no shebang, no `source ~/.nvm/nvm.sh` preamble)
that run automatically at commit time. Paired with lint-staged, they enforce two guarantees before
any commit lands: (1) staged files are auto-formatted with Biome, and (2) FSD rules + TypeScript
types are checked against the full source tree. This keeps broken code and formatting noise out of
history without requiring every developer to remember manual steps.

Pinned versions: `husky@9.1.7`, `lint-staged@17.0.5`.

## Conventions / rules

**Hook files — `.husky/pre-commit` and `.husky/commit-msg`**

Both files are identical in A (`nextjs-fullstack`) and B (`nextjs-frontend`). They are
source-of-truth files managed by `tooling/shared/` and synced via `node tooling/sync.mjs`.

`.husky/pre-commit`:
```sh
pnpm lint-staged
pnpm steiger ./src
if [ "$SKIP_TSC" = "1" ]; then
  echo "Skipping tsc (SKIP_TSC=1)"
else
  pnpm tsc --noEmit
fi
```

`.husky/commit-msg`:
```sh
pnpm commitlint --edit "$1"
```

Husky v9 runs hooks as plain scripts — no shebang line, no environment sourcing. The hook file
content is executed directly.

**lint-staged config — `package.json`**

```json
"lint-staged": {
  "*.{js,jsx,ts,tsx,json,jsonc,css}": [
    "biome check --write --no-errors-on-unmatched"
  ]
}
```

`--no-errors-on-unmatched` prevents lint-staged from failing when a glob matches zero files in a
commit that only touches non-JS assets. `--write` auto-fixes formatting and safe lint rules in
place, then re-stages the file.

**Hook installation**

```json
"prepare": "husky"
```

`pnpm install` (or `pnpm prepare`) installs hooks automatically. After cloning, hooks are live
immediately after the first install.

**SKIP_TSC escape hatch**

TypeScript's full-tree check can be slow on large checkouts. Set `SKIP_TSC=1` to skip it for a
single commit:

```bash
SKIP_TSC=1 git commit -m "feat: wip"
```

Do not make this a habit — CI always runs `pnpm typecheck`.

**Scope of lint-staged vs CI**

lint-staged only touches STAGED files. The full-tree Biome check (`pnpm ci`) runs in CI. This means
lint-staged cannot catch formatting violations in files you did not stage. `git commit --no-verify`
bypasses all hooks — CI will catch whatever was skipped and the build will fail.

## ✅ Best practices

- Let `pnpm lint-staged` auto-fix formatting; stage the result (`git add -p` if you want to
  review the diff first).
- Use `SKIP_TSC=1` only for genuine WIP commits on a personal branch, never on commits heading
  straight to `main`.
- Keep `.husky/pre-commit` and `.husky/commit-msg` in sync with `tooling/shared/` — edit there,
  then run `node tooling/sync.mjs` from the META-repo root.
- The `prepare` script runs on CI too. Since hooks are no-ops outside a Git repo, this is harmless.

## ❌ Worst practices / anti-patterns

- **Do not add a shebang** (`#!/bin/sh`) or `source` lines to hook files — Husky v9 executes them
  directly, and extra lines have caused breakage in earlier migrations from v8.
- **Do not use `git commit --no-verify`** for normal work — it silently bypasses formatting and CI
  will catch the violation on the PR.
- Do not add `--force-exit` or `--bail` flags to lint-staged without team discussion; current flags
  are intentionally minimal.
- Do not put `lint-staged` config in a separate `.lintstagedrc` file — it lives in `package.json`
  so the full workflow is visible in one place.

## References

- https://typicode.github.io/husky/ (Husky v9 docs)
- https://github.com/lint-staged/lint-staged (lint-staged docs)
- https://biomejs.dev/reference/cli/#biome-check (Biome check flags)
