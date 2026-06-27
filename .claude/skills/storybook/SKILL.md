---
name: storybook
description: Use when editing .storybook/**, *.stories.* files, the storybook Vitest project in vitest.config.ts, or changing Storybook addons. Covers the Storybook 10 + Vite-builder + Vitest-browser wiring that silently breaks on the SB9/Vitest-3 patterns.
---

# Storybook (component workshop + browser tests)

**Source of truth:** [`docs/stack/storybook.md`](../../../docs/stack/storybook.md). Storybook **10** on the `@storybook/nextjs-vite` (Vite) builder; stories also run as browser tests via the Vitest addon.

## Load-bearing rules

- **Storybook 10, not 9** — SB9's `@storybook/nextjs-vite` peer-caps at Vite 7; this repo is on Vite 8. Keep all `@storybook/*` in lockstep.
- **Vite builder, not Webpack** — use `@storybook/nextjs-vite` (the Vitest addon needs it), never `@storybook/nextjs`.
- **Vitest 4 browser provider is a factory:** `provider: playwright()` from `@vitest/browser-playwright` — NOT the SB9/Vitest-3 `provider: 'playwright'` string.
- **Reuse the app MSW handlers** via `initialize(..., handlers)` + `mswLoader` in `.storybook/preview.tsx`; stories must not hit the real network.
- **a11y fails CI:** keep `a11y: { test: "error" }`.
- **Native tags, not badge addons:** `tags: ["autodocs", "test"]` on `meta` (badge addons are SB8-only).
- **i18n** comes from the `globalTypes` locale toolbar + the `NextIntlClientProvider` decorator.
- **Don't export stories from a slice `index.ts`** (keeps the public API clean).
- The `storybook`/`build-storybook`/`test-storybook` scripts **set `NEXT_PUBLIC_API_URL`** because `preview.tsx` imports `handlers` → validated env.

## Verify

`pnpm test-storybook` (browser project) and `pnpm build-storybook`. For story/a11y/tag + i18n hygiene, dispatch the **`ui-quality`** subagent.
