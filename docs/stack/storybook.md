# Storybook

**Version:** 10.4.6 (devDependency) — **Storybook 10, not 9.**

## What & why

Storybook is the component workshop for `src/shared/ui/*`. This repo runs Storybook **10** on the `@storybook/nextjs-vite` (Vite) builder so the Vitest addon can transform stories into real browser tests — the same stories render in the sidebar and run in CI via Playwright. a11y checks fail the build, and the app's MSW handlers + the i18n provider are reused so stories behave like the app.

## Conventions / rules

### Files

- `.storybook/main.ts` — `framework: "@storybook/nextjs-vite"`, addons: `addon-docs`, `addon-a11y`, `addon-vitest`, `addon-themes`. `staticDirs: ["../public"]`.
- `.storybook/preview.tsx` — `initialize(..., handlers)` + `mswLoader` (reuses `src/shared/api/mocks/handlers`); `a11y: { test: "error" }`; a `withI18n` decorator wrapping stories in `NextIntlClientProvider`; a `locale` toolbar via `globalTypes` (en/ru/kk); `withThemeByClassName` for light/dark.
- `.storybook/vitest.setup.ts` — `setProjectAnnotations([a11yAddonAnnotations, previewAnnotations])` + `beforeAll`.
- `vitest.config.ts` — a third project named `storybook` via `storybookTest({ configDir })`, running in a real browser (`browser.enabled`, `provider: playwright()` from `@vitest/browser-playwright`, chromium).
- `src/shared/ui/*.stories.tsx` — stories import types from `@storybook/nextjs-vite` and helpers from `storybook/test`.

### Scripts (`package.json`)

The storybook scripts set `NEXT_PUBLIC_API_URL` (and mocking) because `preview.tsx` imports `handlers`, which import the validated env:

```jsonc
"storybook":       "NEXT_PUBLIC_API_URL=https://api.example.com NEXT_PUBLIC_API_MOCKING=enabled storybook dev -p 6006",
"build-storybook": "NEXT_PUBLIC_API_URL=https://api.example.com storybook build",
"test-storybook":  "NEXT_PUBLIC_API_URL=https://api.example.com vitest --project=storybook"
```

### Tags

Use native tags on `meta`: `tags: ["autodocs", "test"]` for sidebar/docs filtering and to opt the story into the Vitest browser run.

## ✅ Best practices

- Storybook **10** + `@storybook/nextjs-vite` (Vite builder) — required because the Vitest addon turns stories into browser tests; the repo is on Vite 8.
- Keep all `@storybook/*` packages in lockstep at the same version.
- Reuse the app's MSW `handlers` via `initialize()` + `mswLoader` so stories hit the mock API, not the real one.
- `a11y: { test: "error" }` to fail CI on accessibility violations.
- Use native **tags** (`autodocs`, `test`) for filtering — not third-party badge addons.
- i18n via `globalTypes` locale toolbar + the `NextIntlClientProvider` decorator.
- Write `play` functions that assert real behavior (see `button.stories.tsx` → `Clickable`).

## ❌ Worst practices / anti-patterns

- **Storybook 9 here** — its `@storybook/nextjs-vite` peer-caps at Vite 7; this repo is on Vite 8.
- `@storybook/nextjs` (Webpack builder) while using the Vitest addon — use `@storybook/nextjs-vite`.
- The Vitest-3 `provider: 'playwright'` **string** — SB10 / Vitest 4 needs the `playwright()` factory from `@vitest/browser-playwright`.
- Badge addons (`@geometricpanda/storybook-addon-badges`, `storybook-addon-badges`) — SB8-only; use native tags.
- Stories hitting the real network instead of MSW handlers.
- Exporting stories from a slice `index.ts` (pollutes the public API).

## References

- Storybook for Next.js (Vite): https://storybook.js.org/docs/get-started/frameworks/nextjs
- Vitest addon: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
- a11y testing: https://storybook.js.org/docs/writing-tests/accessibility-testing
- Tags: https://storybook.js.org/docs/writing-stories/tags
