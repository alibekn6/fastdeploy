# Steiger

## What & why

Steiger (v0.5.12) is a structural linter for Feature-Sliced Design. It statically analyses import graphs across `src/` and reports FSD violations: cross-layer imports, missing public APIs, insignificant slices, etc. Both boilerplates ship identical `steiger.config.ts` files (synced from `tooling/`). It runs on every commit (pre-commit hook) and in CI, enforcing that the codebase keeps its FSD shape as it grows.

The companion plugin is `@feature-sliced/steiger-plugin` v0.5.8.

## Conventions / rules

**How to run**

```bash
pnpm lint:fsd          # = steiger ./src  (defined in package.json)
```

Steiger has no per-file mode — always point it at the `./src` directory. It is primarily a watch tool for development; the CI and pre-commit hook invoke it once (`steiger ./src` with no `--watch`).

**Config file:** `steiger.config.ts` (in both repo roots, synced from `tooling/shared/`):

```ts
import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      "fsd/insignificant-slice": "off",
      "fsd/no-public-api-sidestep": "off",
    },
  },
  {
    files: ["./src/shared/**"],
    rules: { "fsd/public-api": "off", "fsd/no-segmentless-slices": "off" },
  },
]);
```

**Why each override exists:**

| Rule | Status | Reason |
|---|---|---|
| `fsd/insignificant-slice` | off (global) | Boilerplate ships demonstrative slices (e.g. the `@x` `user`/`session` example) whose consumers are wired incrementally; flagging them as unreferenced would produce noise. |
| `fsd/no-public-api-sidestep` | off (global) | `shared/api` exposes cohesive `db` and `auth` modules (each a folder with its own `index.ts`) consumed across layers. Steiger treats these folders as slices and flags their cross-layer imports as sidestepping public API. The shared layer explicitly relaxes public-API enforcement, so the sidestep rule is matched off. |
| `fsd/public-api` | off for `src/shared/**` | `shared` organises by concern (`db/`, `auth/`, `ui/`, `lib/`, `config/`) not by FSD slice; the public-API convention doesn't apply here. |
| `fsd/no-segmentless-slices` | off for `src/shared/**` | Same rationale — `shared` subdirectories are concern modules, not FSD slices. |

**Pre-commit hook** (`nextjs-fullstack/.husky/pre-commit`):
```sh
pnpm lint-staged
pnpm steiger ./src
if [ "$SKIP_TSC" = "1" ]; then ...
```

Steiger runs after `lint-staged` on every commit. Set `SKIP_TSC=1` to skip TypeScript check only; there is no env-var to skip Steiger.

## ✅ Best practices

- Always run `pnpm lint:fsd` after restructuring slices — catches dependency-direction errors that TypeScript path aliases will not.
- Keep `steiger.config.ts` in sync between the two repos (copy from `tooling/shared/`); divergence silently changes which rules apply.
- When adding a new entity that cross-imports another entity's type, use the `@x` protocol — Steiger recognises it and does not raise a `fsd/no-public-api-sidestep` violation.
- In CI, treat Steiger exit-code != 0 as a hard failure before merge.

## ❌ Worst practices / anti-patterns

- **Do not run `steiger path/to/single/file`** — Steiger analyses import graphs; it needs the full `./src` tree to reason about them.
- **Do not disable `fsd/no-cross-imports` globally** — that rule is the backbone of layer isolation; the only legitimate bypass is `@x`.
- **Do not add new global rule overrides without a comment** — the config already has explicit comments for every `"off"` entry; undocumented overrides create invisible holes.
- **Do not skip the pre-commit hook with `--no-verify` habitually** — that strands FSD violations in the branch until CI.

## References

- Steiger: https://github.com/feature-sliced/steiger
- `@feature-sliced/steiger-plugin`: https://github.com/feature-sliced/steiger/tree/main/packages/steiger-plugin-fsd
- FSD rule catalogue: https://github.com/feature-sliced/steiger/tree/main/packages/steiger-plugin-fsd/src/rules
