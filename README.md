# nextjs-frontend

A production-style **Next.js 16 + Feature-Sliced Design** boilerplate for a frontend that consumes
an **external HTTP API** — mocked with **MSW** in dev/test. Auth calls that API directly and the
backend sets a Secure httpOnly session cookie.

## Quickstart

```bash
pnpm install
cp .env.example .env   # NEXT_PUBLIC_API_URL=...  NEXT_PUBLIC_API_MOCKING=disabled
pnpm dev:mock          # runs with MSW mocks enabled → http://localhost:3000
```

Sign in at `/login` (the mocked login accepts any credentials), then visit `/dashboard` to see the
MSW-served post list. Point `NEXT_PUBLIC_API_URL` at a real API and set `NEXT_PUBLIC_API_MOCKING=disabled`
to go live (see `docs/stack/msw.md` for the MSW deletion checklist).

## Commands

| Task | Command |
| --- | --- |
| Dev (mocked) | `pnpm dev:mock` · plain: `pnpm dev` |
| Lint / format | `pnpm lint` · `pnpm lint:fix` · CI: `pnpm lint:ci` |
| FSD architecture lint | `pnpm lint:fsd` |
| Type-check | `pnpm typecheck` |
| Unit tests | `pnpm test` |
| Integration (MSW network boundary, no Docker) | `pnpm test:integration` |
| E2E (Playwright) | `pnpm e2e` |
| Storybook (dev / build / test) | `pnpm storybook` · `pnpm build-storybook` · `pnpm test-storybook` |
| Guided commit | `pnpm cz` |

`pnpm lint:ci` runs Biome over the whole tree (including `docs/` and JSON) — it is the CI gate.

## Stack

Next.js 16 (App Router/RSC) · React 19 · TypeScript (strict) · pnpm · **Biome** (lint+format) ·
**Tailwind v4** + **shadcn/ui** · **Feature-Sliced Design** enforced by **Steiger** ·
**TanStack Query** · **React Hook Form** + **Zod** · **ky** (HTTP) + Zod-validated fetcher ·
**MSW** (mock API) · direct-to-backend httpOnly-cookie auth ·
**Vitest** + Testing Library + **Playwright** + MSW · Husky + lint-staged + Commitizen/Commitlint ·
Docker · GitHub Actions · `@t3-oss/env-nextjs`.

## i18n, analytics, SEO

- **i18n (next-intl):** locales `en` (default), `ru`, `kk` (Kazakh). Routing is `as-needed` — `en` is unprefixed (`/`, `/login`); other locales are prefixed (`/ru`, `/kk/dashboard`). Messages live in `messages/{en,ru,kk}.json`. See `docs/stack/i18n.md`.
- **Storybook:** `pnpm storybook` for the component workshop; `pnpm test-storybook` runs the stories as Vitest browser tests (a11y violations fail). See `docs/stack/storybook.md`.
- **Analytics (PostHog, self-hosted):** set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to enable; **leave the key blank to disable** (everything becomes a no-op). Events route through the `/ingest` reverse proxy. See `docs/stack/posthog.md`.
- **SEO:** Next 16 Metadata API with per-locale canonical + hreflang, `noindex` on `/login` and `/dashboard`, and generated `robots.txt`, `sitemap.xml`, and OG image (`app/robots.ts`, `app/sitemap.ts`, `app/[locale]/opengraph-image.tsx`). Set `NEXT_PUBLIC_SITE_URL` for absolute URLs. See `docs/stack/seo.md`.

## Architecture

Feature-Sliced Design under `src/` (`app, pages, widgets, features, entities, shared`), with the
Next App Router at the **root** `app/` (thin re-exports) and an empty root `pages/` placeholder.
Per-tool rules and best/worst practices are in **`docs/stack/`**. Agent guidance is in `CLAUDE.md`.
