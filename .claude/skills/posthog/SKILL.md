---
name: posthog
description: Use when editing src/shared/analytics/**, the POSTHOG env vars, identify/reset call sites, or the /ingest reverse-proxy rewrites in next.config.ts. Covers the no-op-when-unconfigured contract and App Router pageview capture.
---

# PostHog (product analytics, optional)

**Source of truth:** [`docs/stack/posthog.md`](../../../docs/stack/posthog.md). posthog-js 1.395.0, self-hosted. Analytics is **fully optional** — unset `NEXT_PUBLIC_POSTHOG_KEY` ⇒ everything is a no-op.

## Load-bearing rules

- **No-op when unconfigured.** `NEXT_PUBLIC_POSTHOG_KEY` is `.optional()`; `PostHogProvider` returns `<>{children}</>` when unset; every helper guards on `analyticsConfigured()`. Preserve all three.
- **Guard `typeof window`** in `initAnalytics()` — never `init()` server-side.
- **Manual `$pageview`** (App Router has no router events) from a **Suspense-wrapped** `useSearchParams` component (`pageview-tracker.tsx`); `capture_pageview: false`, `capture_pageleave: true`.
- **`/ingest` reverse proxy:** events go through same-origin `/ingest` rewrites in `next.config.ts` + `skipTrailingSlashRedirect: true`; `ui_host` = the self-hosted instance. Don't point `api_host` at the raw PostHog domain.
- **Consent:** opt-out-by-default + `persistence: "memory"`; `acceptConsent()` upgrades persistence and `opt_in_capturing()`; `rejectConsent()` opts out.
- **`identify` on login, `reset` on logout.** Use a stable backend user id as the distinct id — the boilerplate uses the auth token with a flagged TODO (`sign-in.ts`); don't ship that to production.
- **Never commit a real project key.**

## Verify

`pnpm test` (`posthog.test.ts`) + `pnpm typecheck`. Confirm the app still builds/runs with `NEXT_PUBLIC_POSTHOG_KEY` unset (no-op path).
