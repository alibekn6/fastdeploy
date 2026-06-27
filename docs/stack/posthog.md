# PostHog

**Version:** posthog-js 1.395.0 (dependency) — self-hosted instance.

## What & why

PostHog is the product-analytics client. It is wired to be **fully optional**: when `NEXT_PUBLIC_POSTHOG_KEY` is unset, every helper and the provider become no-ops, so the boilerplate builds and runs with analytics disabled. Events are sent through a same-origin `/ingest` reverse proxy (ad-block resilient), consent is opt-out-by-default, and pageviews are captured manually because the App Router has no router events.

## Conventions / rules

### Files (`src/shared/analytics/`)

- `posthog.ts` — `initAnalytics()` guards `typeof window` and the key, then `posthog.init(key, { api_host: "/ingest", ui_host, capture_pageview: false, capture_pageleave: true, person_profiles: "identified_only", opt_out_capturing_by_default: true, persistence: "memory" })`. Re-exports `posthog`.
- `consent.ts` — `analyticsConfigured()` (key present?), `acceptConsent()` (upgrade persistence to `localStorage+cookie` + `opt_in_capturing()`), `rejectConsent()` (`opt_out_capturing()`), `consentDecided()`. Each guards on `analyticsConfigured()`.
- `posthog-provider.tsx` — `"use client"`; `initAnalytics()` in `useEffect`; **passthrough** (`<>{children}</>`) when the key is unset, else `<PHProvider client={posthog}>`.
- `pageview-tracker.tsx` — manual `$pageview` from `usePathname`/`useSearchParams`, **Suspense-wrapped**.
- `consent-banner.tsx` — shows only when `analyticsConfigured() && !consentDecided()`.
- `identify.ts` — `identifyUser(distinctId, props?)`, `resetUser()`, both guarded.
- `index.ts` — public API.

### Wiring

- `src/shared/config/env.ts` — `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` are `.optional()`; leaving the key blank disables analytics.
- `next.config.ts` — `skipTrailingSlashRedirect: true` + `rewrites()` mapping `/ingest/static/:path*` and `/ingest/:path*` to `NEXT_PUBLIC_POSTHOG_HOST` (returns `[]` when the host is unset).
- `app/[locale]/layout.tsx` — `PostHogProvider` wraps the tree; `PageViewTracker` + `ConsentBanner` are siblings.
- `identifyUser(token)` on login (`src/features/auth/api/sign-in.ts`); `resetUser()` on logout (`src/widgets/header/ui/header.tsx`).

## ✅ Best practices

- **No-op when unconfigured**: env `.optional()`, provider passthrough, every helper guards on `analyticsConfigured()`.
- `/ingest` reverse-proxy rewrites + `skipTrailingSlashRedirect` for ad-block resilience; `ui_host` points at the self-hosted instance.
- Manual `$pageview` (the App Router has no router events) inside a **Suspense-wrapped** `useSearchParams` component.
- `capture_pageleave: true`; `person_profiles: "identified_only"`.
- Consent opt-out-by-default + `persistence: "memory"`; on accept, upgrade persistence and `opt_in_capturing()`.
- `identify` on login, `reset` on logout.

## ❌ Worst practices / anti-patterns

- Relying on default autocapture pageview in the App Router — it fires once and misses SPA navigation.
- An unwrapped `useSearchParams` — deopts the page to client-side / breaks static generation.
- Calling `init()` server-side — guard `typeof window`.
- Using the auth token as the distinct id — use the stable backend user id. **This boilerplate uses the token with a flagged TODO** (`sign-in.ts`); replace it with a real user id (e.g. from `/me`).
- Committing a real project key.

## References

- posthog-js docs: https://posthog.com/docs/libraries/js
- Next.js + App Router: https://posthog.com/docs/libraries/next-js
- Reverse proxy: https://posthog.com/docs/advanced/proxy/nextjs
- Consent / opt-out: https://posthog.com/docs/privacy/opt-out-capturing
