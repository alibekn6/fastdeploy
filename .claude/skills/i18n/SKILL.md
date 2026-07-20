---
name: i18n
description: Use when editing src/shared/i18n/**, messages/**, app/[locale]/**, adding next-intl usage, or touching the locale middleware in proxy.ts. Covers the as-needed locale routing and the static-rendering rules that silently break.
---

# next-intl (i18n)

**Source of truth:** [`docs/stack/i18n.md`](../../../docs/stack/i18n.md). Locales: `en` (default, unprefixed), `ru`, `kk` — `kk` is Kazakh, **not** `kz`. `localePrefix: "as-needed"`.

## Load-bearing rules

- **`await params`** — in Next 16 `params` is a Promise: `const { locale } = await params;`.
- **`setRequestLocale(locale)`** in every static layout/page **before** any translation call — omitting it silently forces dynamic rendering.
- **Static metadata:** pass an explicit `{ locale }` to `getTranslations` in `generateMetadata`.
- **Typed messages** come from `global.d.ts` (`AppConfig` augmentation from `messages/en.json`) — keep `en/ru/kk` JSON in sync; never hardcode UI strings.
- **Navigate** with `Link`/`useRouter`/`redirect` from `@/shared/i18n` (locale-aware) — not `next/link`.
- **`proxy.ts` order — i18n-first:** `createMiddleware(routing)` runs **first** and owns every locale-prefix redirect (a non-`ok` response is returned untouched). The canonical delocalized path is then read from the `x-middleware-rewrite` header with the leading segment clamped against `routing.locales` (unknown ⇒ default locale, so nothing raw reaches a redirect target), and **only then** does `checkRouteAccess` run, emitting at most one locale-prefixed redirect. The matcher stays site-wide but **excludes `ingest`** (the PostHog proxy): `"/((?!api|ingest|_next|_vercel|.*\\..*).*)"` — otherwise the locale prefix breaks the `/ingest` capture rewrite.

## Verify

`pnpm typecheck` (catches missing/extra message keys via `global.d.ts`) + `pnpm test`. For metadata/canonical/hreflang correctness, dispatch the **`ui-quality`** subagent.
