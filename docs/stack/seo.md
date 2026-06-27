# SEO (Next.js 16 Metadata)

**Tooling:** Next.js 16 Metadata API + metadata-route files (no extra dependency).

## What & why

SEO is built on Next's typed Metadata API plus file-based metadata routes. Each localized page exports `generateMetadata` for per-locale titles/descriptions and correct canonical + hreflang links; `robots.ts`, `sitemap.ts`, and `opengraph-image.tsx` are real files under `app/` so Next generates `robots.txt`, `sitemap.xml`, and the OG image. A small `src/shared/config/seo.ts` centralizes the site URL and alternate-link construction.

## Conventions / rules

### Files

- `app/[locale]/layout.tsx` — root `metadata` (`metadataBase: new URL(SITE_URL)`, `title.template`/`default`, openGraph, twitter) **and** a separate `viewport` export (`themeColor`, `colorScheme`).
- `app/[locale]/{page,login/page,dashboard/page}.tsx` — `generateMetadata` via `getTranslations({ locale, namespace: "Metadata" })` + `buildAlternates(locale, path)`. `/login` and `/dashboard` add `robots: { index: false, follow: false, googleBot: {...} }`.
- `src/shared/config/seo.ts` — `SITE_URL` (= `env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`), `localizedUrl(locale, path)` (as-needed prefixing; root `/` yields no trailing slash), `buildAlternates(locale, path)` (self-canonical + `languages` for en/ru/kk + `x-default` → en).
- `app/robots.ts` — `MetadataRoute.Robots`; disallows `/dashboard`, `/login`, `/api/`; points `sitemap`/`host` at `SITE_URL`.
- `app/sitemap.ts` — `MetadataRoute.Sitemap`; default-locale URL + per-entry `alternates.languages`.
- `app/[locale]/opengraph-image.tsx` — `ImageResponse` (1200×630). Runs on the **default Node runtime** (no `export const runtime = "edge"`) and uses no local fonts.

## ✅ Best practices

- Set `metadataBase` so relative OG/canonical URLs resolve.
- Use `title.template` + `title.default`.
- Put `themeColor`/`colorScheme` in the **`viewport`** export, not `metadata`.
- Per-page `generateMetadata` via `getTranslations({ locale, ... })`.
- Self-referencing canonical per locale + `alternates.languages` (en/ru/kk) + `x-default` → en.
- Keep `robots.ts`/`sitemap.ts`/`opengraph-image.tsx` as **real files** in `app/`.
- `noindex` (`robots: { index: false }`) on `/login` + `/dashboard`.
- Node runtime for OG when using local fonts (no `edge`).
- `await params` in `generateMetadata`.
- Keep a runtime `SITE_URL` fallback (`?? "http://localhost:3000"`) so `SKIP_ENV_VALIDATION=1` builds don't crash on `new URL(undefined)`.

## ❌ Worst practices / anti-patterns

- `themeColor` in `metadata` — ignored; it belongs in `viewport`.
- A relative OG image without `metadataBase`.
- Cross-locale or missing canonical — splits indexing signals.
- A trailing-slash canonical pointing at a URL that redirects.
- Expensive, un-memoized fetches inside `generateMetadata` on `force-dynamic` routes (e.g. `/dashboard`).

## References

- Metadata API: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- `viewport` export: https://nextjs.org/docs/app/api-reference/functions/generate-viewport
- robots / sitemap / OG image: https://nextjs.org/docs/app/api-reference/file-conventions/metadata
- hreflang / alternates: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#alternates
