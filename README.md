# nextjs-frontend

A production-style **Next.js 15 + Feature-Sliced Design** boilerplate for a frontend that consumes
an **external HTTP API** — mocked with **MSW** in dev/test — with a thin httpOnly-cookie BFF for auth.

## Quickstart

```bash
pnpm install
cp .env.example .env   # NEXT_PUBLIC_API_URL=...  NEXT_PUBLIC_API_MOCKING=disabled
pnpm dev:mock          # runs with MSW mocks enabled → http://localhost:3000
```

Sign in at `/login` (the mocked BFF accepts any credentials), then visit `/dashboard` to see the
MSW-served post list. Point `NEXT_PUBLIC_API_URL` at a real API and set `NEXT_PUBLIC_API_MOCKING=disabled`
to go live (see `docs/stack/msw.md` for the MSW deletion checklist and `docs/stack/bff-auth.md` for the
Better Auth swap).

## Commands

| Task | Command |
| --- | --- |
| Dev (mocked) | `pnpm dev:mock` · plain: `pnpm dev` |
| Lint / format | `pnpm lint` · `pnpm lint:fix` · CI: `pnpm ci` |
| FSD architecture lint | `pnpm lint:fsd` |
| Type-check | `pnpm typecheck` |
| Unit tests | `pnpm test` |
| Integration (MSW network boundary, no Docker) | `pnpm test:integration` |
| E2E (Playwright) | `pnpm e2e` |
| Guided commit | `pnpm cz` |

## Stack

Next.js 15 (App Router/RSC) · React 19 · TypeScript (strict) · pnpm · **Biome** (lint+format) ·
**Tailwind v4** + **shadcn/ui** · **Feature-Sliced Design** enforced by **Steiger** ·
**TanStack Query** · **React Hook Form** + **Zod** · **ky** (HTTP) + Zod-validated fetcher ·
**MSW** (mock API) · thin httpOnly-cookie BFF (Better Auth = documented swap-in) ·
**Vitest** + Testing Library + **Playwright** + MSW · Husky + lint-staged + Commitizen/Commitlint ·
Docker · GitHub Actions · `@t3-oss/env-nextjs`.

## Architecture

Feature-Sliced Design under `src/` (`app, pages, widgets, features, entities, shared`), with the
Next App Router at the **root** `app/` (thin re-exports) and an empty root `pages/` placeholder.
Per-tool rules and best/worst practices are in **`docs/stack/`**. Agent guidance is in `CLAUDE.md`.
