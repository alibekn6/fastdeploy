# Biome

## What & why

Biome is the single tool responsible for **formatting, linting, and import organisation** in this
boilerplate. It replaces ESLint + Prettier with one binary and one config file, delivering
significantly faster feedback (Biome processes files in parallel with no plugin resolution
overhead). A single `biome.json` covers all concerns; there is no `.eslintrc`, `.prettierrc`, or
`.editorconfig` in this repo.

Pinned version: `@biomejs/biome@2.2.4` (devDependency).

## Conventions / rules

**Config file — `biome.json`** (verbatim from repo root)

```json
{
  "$schema": "https://biomejs.dev/schemas/2.2.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "ignoreUnknown": true,
    "includes": [
      "**",
      "!**/.next",
      "!**/node_modules",
      "!**/dist",
      "!**/drizzle",
      "!**/coverage",
      "!**/playwright-report",
      "!**/mockServiceWorker.js"
    ]
  },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "double", "semicolons": "always" } },
  "assist": { "enabled": true, "actions": { "source": { "organizeImports": "on" } } },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "nursery": {
        "useSortedClasses": {
          "level": "warn",
          "options": {
            "attributes": ["className", "class"],
            "functions": ["clsx", "cva", "cn", "tw", "twMerge"]
          }
        }
      },
      "suspicious": { "noUnknownAtRules": "off" }
    }
  }
}
```

**Formatter settings**

| Setting | Value |
|---|---|
| Indent | 2 spaces |
| Quotes (JS/TS) | double |
| Semicolons | always |
| Line width | 100 |

**Import organisation** is handled by `assist.actions.source.organizeImports: "on"`. Biome
automatically sorts and groups imports when running `--write` or the IDE save action.

**Scripts (`package.json`)**

| Script | Command | When to use |
|---|---|---|
| `pnpm lint` | `biome check` | Quick local check (no writes) |
| `pnpm lint:fix` | `biome check --write` | Fix all auto-fixable issues |
| `pnpm ci` | `biome ci` | CI — exits non-zero on any error |

**Pre-commit hook (lint-staged)**

`lint-staged` runs `biome check --write --no-errors-on-unmatched` on staged
`*.{js,jsx,ts,tsx,json,jsonc,css}` files only. This keeps pre-commit fast by limiting scope to
what is actually staged, while `pnpm ci` checks the full tree in CI.

**Key rule decisions**

- `nursery.useSortedClasses` — set to `"warn"` with **unsafe** autofix. This means:
  - It surfaces unsorted Tailwind class strings as warnings in `biome check` output.
  - It does **not** auto-apply on `biome check --write` (unsafe fixes require `--write --unsafe`).
  - Warnings do **not** cause `biome check` or `biome ci` to exit non-zero — it is non-blocking.
  - The rule scans `className`/`class` attributes and the helper functions `clsx`, `cva`, `cn`,
    `tw`, `twMerge` (matching the project's actual helpers).
  - To apply the sort manually: `pnpm dlx @biomejs/biome check --write --unsafe src/`.

- `suspicious.noUnknownAtRules: "off"` — disables the rule that would flag Tailwind v4's
  `@theme`, `@custom-variant`, and `@import "tailwindcss"` directives as unknown CSS at-rules.
  Without this, Biome would emit errors on every line of `globals.css`.

- `vcs.useIgnoreFile: true` — Biome respects `.gitignore`. As a result, `coverage/`,
  `playwright-report/`, and `test-results/` are excluded without listing them in `files.includes`.

- `!**/mockServiceWorker.js` — MSW generates this worker file in `public/`; it is minified and
  auto-generated. Excluding it prevents Biome from reporting formatting violations on foreign code.

**Shared-config sync — IMPORTANT**

`biome.json` is synced verbatim from `tooling/` into each repo. The sync CI compares file bytes
between the canonical source and each repo copy. Because Biome reformats `biome.json` itself on
`biome check --write`, the canonical source **must** be kept in Biome's own canonical formatting at
all times. If you edit `biome.json` by hand (e.g. in this `tooling/` source), run
`biome check --write` on it before committing, otherwise synced copies will show a byte diff and
the sync CI will fail.

## ✅ Best practices

- Run `pnpm lint:fix` before pushing; it handles formatting + safe lint fixes in one pass.
- Let Biome organise imports automatically — do not hand-sort `import` blocks.
- Keep `biome.json` Biome-formatted (run `biome check --write biome.json` after hand-edits).
- Use `// biome-ignore lint/<group>/<rule>: <reason>` for targeted suppressions; avoid blanket
  disables.

## ❌ Worst practices / anti-patterns

- **Do not install ESLint or Prettier** — Biome replaces both; mixing them causes conflicting
  fixes.
- Do not remove `noUnknownAtRules: "off"` — doing so will make Biome error on `globals.css`.
- Do not set `useSortedClasses` to `"error"` without switching to `--write --unsafe` in all
  pipelines — it would make `biome ci` fail on unsorted classes before they can be fixed.
- Do not add `autoprefixer` to PostCSS as a Prettier substitute; formatting is Biome's job.
- Do not commit a hand-formatted `biome.json`; always let Biome canonicalise it.

## References

- https://biomejs.dev/guides/getting-started/ (setup)
- https://biomejs.dev/reference/configuration/ (full `biome.json` reference)
- https://biomejs.dev/linter/rules/use-sorted-classes/ (`useSortedClasses` rule)
- https://biomejs.dev/formatter/ (formatter options)
- https://biomejs.dev/guides/integrate-in-ci/ (CI integration)
