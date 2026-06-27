---
name: seo
description: Use when editing metadata or generateMetadata, app/robots.ts, app/sitemap.ts, app/[locale]/opengraph-image.tsx, or src/shared/config/seo.ts. Covers metadataBase, the viewport split, and self-referencing canonical + hreflang.
---

# SEO (Next.js 16 Metadata)

**Source of truth:** [`docs/stack/seo.md`](../../../docs/stack/seo.md). Built on Next's Metadata API + file-based metadata routes; canonical/hreflang come from `src/shared/config/seo.ts`.

## Load-bearing rules

- **`metadataBase`** is set in the root `app/[locale]/layout.tsx` (`new URL(SITE_URL)`) so relative OG/canonical URLs resolve.
- **`themeColor`/`colorScheme` go in the `viewport` export**, NOT `metadata` (Next ignores them in `metadata`).
- **Per-page `generateMetadata`** via `getTranslations({ locale, ... })`; **`await params`**.
- **Canonical + hreflang:** use `buildAlternates(locale, path)` — self-referencing canonical per locale + `languages` for en/ru/kk + `x-default` → en. Never a cross-locale or missing canonical.
- **`noindex` private routes:** `robots: { index: false, follow: false, googleBot: {...} }` on `/login` and `/dashboard`.
- **Metadata routes are real files** in `app/`: `robots.ts`, `sitemap.ts`, `app/[locale]/opengraph-image.tsx`. OG runs on the Node runtime (no `edge` with local fonts).
- **`SITE_URL` fallback** (`?? "http://localhost:3000"`) must stay so `SKIP_ENV_VALIDATION=1 pnpm build` doesn't crash on `new URL(undefined)`.
- **No expensive un-memoized fetches** in `generateMetadata` on `force-dynamic` routes.

## Verify

`SKIP_ENV_VALIDATION=1 pnpm build` (exercises the metadata routes + the `SITE_URL` fallback) + `pnpm typecheck`. For canonical/hreflang/viewport correctness, dispatch the **`ui-quality`** subagent.
