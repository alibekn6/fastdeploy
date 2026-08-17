# Frontend template internals

A production-style **Next.js 16 + Feature-Sliced Design** boilerplate for a frontend that consumes
an **external HTTP API** — mocked with **MSW** in dev/test. Auth calls that API directly and the
backend sets Secure httpOnly `access_token`/`refresh_token` cookies (see
[Authentication](#authentication)).

## Quickstart

```bash
pnpm install
cp .env.example .env   # NEXT_PUBLIC_API_URL=...  NEXT_PUBLIC_API_MOCKING=disabled
pnpm dev:mock          # runs with MSW mocks enabled → http://localhost:3000
```

Sign in at `/login` (the mocked login accepts any credentials), then visit `/dashboard` to see the
MSW-served post list. Point `NEXT_PUBLIC_API_URL` at a real API and set `NEXT_PUBLIC_API_MOCKING=disabled`
to go live (see `stack/msw.md` for the MSW deletion checklist).

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

- **i18n (next-intl):** locales `en` (default), `ru`, `kk` (Kazakh). Routing is `as-needed` — `en` is unprefixed (`/`, `/login`); other locales are prefixed (`/ru`, `/kk/dashboard`). Messages live in `messages/{en,ru,kk}.json`. See `stack/i18n.md`.
- **Storybook:** `pnpm storybook` for the component workshop; `pnpm test-storybook` runs the stories as Vitest browser tests (a11y violations fail). See `stack/storybook.md`.
- **Analytics (PostHog, self-hosted):** set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to enable; **leave the key blank to disable** (everything becomes a no-op). Events route through the `/ingest` reverse proxy. See `stack/posthog.md`.
- **SEO:** Next 16 Metadata API with per-locale canonical + hreflang, `noindex` on `/login` and `/dashboard`, and generated `robots.txt`, `sitemap.xml`, and OG image (`app/robots.ts`, `app/sitemap.ts`, `app/[locale]/opengraph-image.tsx`). Set `NEXT_PUBLIC_SITE_URL` for absolute URLs. See `stack/seo.md`.

## Architecture

Feature-Sliced Design under `src/` (`app, pages, widgets, features, entities, shared`), with the
Next App Router at the **root** `app/` (thin re-exports) and an empty root `pages/` placeholder.
Per-tool rules and best/worst practices are in **`stack/`**. Agent guidance is in `CLAUDE.md`.

## Authentication

Auth is **backend-owned**. The app calls the external API directly (`auth/login`, `auth/register`,
`auth/refresh`, `auth/logout`) and the backend replies with two Secure httpOnly cookies —
`access_token` (short-lived) and `refresh_token` (30 days) — both `SameSite=Lax; Path=/`. No token
ever lives in `localStorage` or JS memory, and session state lives only in the TanStack Query cache.
The cookies must land on the app's origin (same site, or a shared registrable domain) or neither the
middleware nor SSR can read them.

**Route guard — routing only, not security.** `proxy.ts` composes next-intl **i18n-first**, then runs
`checkRouteAccess` (`src/shared/lib/route-guard/`). The guard base64url-decodes the access token's
payload and **never verifies its signature** — it reads UNVERIFIED claims purely to decide where to
send the browser. It is a pure, total function (never throws, no network) and treats a token as live
iff `exp` is numeric and within a 30 s clock-skew grace. A bare `refresh_token` also admits, since it
can mint a new access token; but only a *live* access token bounces you off `/login`, so a revoked
refresh cookie can't trap you in a redirect loop. **The API is the real security boundary:** a forged
or edited cookie gets you a page shell and nothing else — every byte of data still comes from an API
call the backend authorizes. The guard runs identically in every mode; there is no mock-mode bypass.

**Transparent refresh.** A 401 from any non-auth route is handled by a ky `afterResponse` hook
(`src/shared/api/refresh-hook.ts`): it issues a **single in-flight** `auth/refresh` (concurrent 401s
await the same promise, so the backend sees one refresh per expiry burst), then retries the original
request **once** via raw `fetch`, which bypasses the hook and so cannot recurse. There is no refresh
rotation — the `refresh_token` is not reissued. If the refresh fails (e.g. server-side revocation),
the escape happens inside the shared promise chain, so N concurrent failures still produce **exactly
one** `auth/logout` + one redirect to the locale-correct login page. That logout is what breaks the
loop: only the backend can delete an httpOnly cookie, and `auth/logout` clears both unconditionally.

**Mock mode limits.** With `NEXT_PUBLIC_API_MOCKING=enabled`, MSW mints unsigned `alg:none` JWTs with
real `exp`/`iat` claims so the guard behaves exactly as in production, and the client writes the two
cookies via `document.cookie` — a Service Worker cannot set httpOnly cookies, so mock cookies are
readable by JS and are **not** httpOnly, Secure, or backend-controlled. Production responses never
carry token values in the body. The WebSocket example connects over `wss://` (enforced by a Zod
refine on `NEXT_PUBLIC_WS_URL`, relaxed to `ws://` only for localhost) and relies on the httpOnly
cookies riding the same-site upgrade request rather than a `?token=` query param. MSW's `ws.link()`
mock **cannot read cookies on the upgrade**, so WebSocket cookie authentication is exercised only
against a real backend and is **not covered by this repo's test suite**.

**Deliberate tradeoff — email enumeration.** Sign-up surfaces a distinct message on a 409
(`emailTaken`) instead of collapsing it into the generic error. That is a knowing, documented email
enumeration tradeoff: it tells an attacker which addresses are registered, in exchange for a
materially better signup experience. If your threat model forbids it, return a generic message and
confirm by email instead.

**Backend assumptions.** This frontend is only as safe as the API behind it. The backend must:
verify the JWT **signature** and expiry on every request (the frontend never does); enforce the
password policy server-side (minimum 12 characters — client validation is UX only); rate-limit
`auth/login` and `auth/register` (the UI renders a `429` state but cannot enforce anything); expire
and revoke refresh tokens server-side, honouring the no-rotation contract; and set the cookies
`Secure; HttpOnly; SameSite=Lax; Path=/`. `SameSite=Lax` is the CSRF posture: it blocks cross-site
POSTs while allowing top-level navigations, so state-changing endpoints must stay non-`GET`; add CSRF
tokens if you ever need `SameSite=None`. Production deployment requires HTTPS — the Secure httpOnly
cookies do not function over plain HTTP.
