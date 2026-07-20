# Next.js

## What & why

Both boilerplates use Next.js 16.x (App Router, Turbopack by default for dev and build). It provides file-based routing, React Server Components, Server Actions, Route Handlers, and `output: "standalone"` for Docker deployment. The challenge in an FSD codebase is that Next.js App Router wants to own routing under `app/`, while FSD defines its own `app` and `pages` layers under `src/`. The two-directory trick below resolves this without hacks.

## Conventions / rules

### Directory layout

```
<repo root>/
  app/                  ← Next.js route tree (thin re-exports only)
    layout.tsx          ← RootLayout, mounts providers from @/app/providers
    page.tsx            ← export { HomePage as default } from "@/pages/home"
    dashboard/
      page.tsx          ← export const dynamic = "force-dynamic"; + re-export
    login/
      page.tsx
    api/…/route.ts      ← re-exports from src/app/api-routes/*
  pages/
    .gitkeep            ← EMPTY — makes Next ignore src/app & src/pages as routes
  src/
    app/                ← FSD app layer (providers, styles, api-routes glue)
    pages/              ← FSD pages layer (real page components)
    widgets/ features/ entities/ shared/
```

**Why the empty `pages/.gitkeep`?** When Next.js detects both a root `app/` and a root `pages/` directory, it no longer scans `src/app` or `src/pages` as route sources. This prevents the FSD layer names from colliding with Next's routing — without it, Next would try to route `src/pages/dashboard` as `/dashboard`.

### Root `app/` files are pure glue

Every route file is a one- or two-liner:

```ts
// app/page.tsx
export { HomePage as default } from "@/pages/home";

// app/dashboard/page.tsx
export const dynamic = "force-dynamic";
export { DashboardPage as default } from "@/pages/dashboard";
```

No logic, no imports from outside FSD, no JSX.

### `export const dynamic = "force-dynamic"`

Required in `app/dashboard/page.tsx` (both repos). The FSD `DashboardPage` calls the database (fullstack) or prefetches via the external API (frontend) at render time. Without `force-dynamic`, Next tries a build-time static render, which fails with no DB/API present during `docker build`. All routes that read runtime-only data must carry this export.

### Route Handlers

Route handler files (`app/api/**/route.ts`) re-export handler functions from `src/app/api-routes/`:

```ts
// app/api/posts/route.ts
import { getPosts } from "@/app/api-routes/posts";
export const GET = getPosts;

// src/app/api-routes/posts.ts
import { listPosts } from "@/entities/post";
export async function getPosts() {
  return NextResponse.json(await listPosts());
}
```

**Fullstack repo** uses Server Actions for mutations (`"use server"` in `src/features/create-post/api/create-post.ts`). Mutations go through `auth.api.getSession` before touching the DB.

**Frontend repo** calls the external API directly for auth (`http.post("auth/login")` in `src/features/auth/api/sign-in.ts`); the backend sets two Secure httpOnly cookies, `access_token` and `refresh_token` (`SameSite=Lax; Path=/`). It has no auth Route Handlers.

### Proxy

Both repos use a root `proxy.ts` (renamed from `middleware.ts` in Next.js 16; the exported function is now `proxy`, and it runs on the Node.js runtime — the Edge runtime is not supported in `proxy`). Each redirects unauthenticated requests to `/login` before the page renders.

**Fullstack** uses `getSessionCookie` from `better-auth/cookies` with a `["/dashboard/:path*"]` matcher.

**Frontend** composes locale routing with the auth guard **i18n-first** under a **site-wide** matcher, `"/((?!api|ingest|_next|_vercel|.*\\..*).*)"` — site-wide because next-intl must see every request to resolve locales (`ingest` is excluded so the PostHog reverse-proxy rewrite isn't locale-prefixed). `createMiddleware(routing)` runs first and owns locale-prefix redirects; the canonical delocalized path is then derived from its `x-middleware-rewrite` header (leading segment clamped against `routing.locales`, so nothing raw reaches a redirect target); only then does `checkRouteAccess` (`src/shared/lib/route-guard/`) run and emit at most one locale-prefixed redirect. The guard is **not** a cookie-presence check: it base64url-decodes the `access_token` payload **without verifying the signature** and applies a real `exp` liveness test (30 s skew grace). It is a routing gate only — the API remains the security boundary. See `docs/stack/i18n.md` for the full pipeline.

### Providers in `app/layout.tsx`

Providers are client components composed in `RootLayout`:

- **Fullstack:** `QueryProvider` only (`src/app/providers/query-provider.tsx`).
- **Frontend:** `MswProvider` wrapping `QueryProvider` (`src/app/providers/msw-provider.tsx`). `MswProvider` starts the MSW service worker when `NEXT_PUBLIC_API_MOCKING=enabled` but renders children immediately (delaying render would suppress the SSR body); the ky transport awaits `mockWorkerReady()` instead.

### Docker / standalone output

`next.config.ts`:
```ts
const nextConfig: NextConfig = { output: "standalone" };
```

Produces a self-contained `/.next/standalone` directory. The `Dockerfile` copies only that directory plus `public/` and `/.next/static/`.

### Dev commands

```bash
pnpm dev            # Next dev server with Turbopack
pnpm dev:mock       # (frontend only) sets NEXT_PUBLIC_API_MOCKING=enabled
pnpm build          # production build (requires .env or SKIP_ENV_VALIDATION=1)
```

## ✅ Best practices

- Keep root `app/` files as single re-exports; any real logic belongs inside `src/`.
- Add `export const dynamic = "force-dynamic"` to every route that reads from a DB, external API, or request cookies at render time.
- Use Server Actions for data mutations in the fullstack repo — they stay co-located in `src/features/<name>/api/` and are validated with Zod before hitting the DB.
- Always set `SKIP_ENV_VALIDATION=1` for `docker build` stages that don't have a `.env` file available.

## ❌ Worst practices / anti-patterns

- **Do not put page components in root `app/`** — they belong in `src/pages/`.
- **Do not remove `pages/.gitkeep`** — without it, Next.js will treat `src/pages/` as a Pages Router directory or ignore the route conflict guard.
- **Do not import from `app/` back into `src/`** — the root `app/` files are leaves in the dependency graph.
- **Do not use `export const dynamic = "force-static"` on authenticated pages** — that will fail at build time with no session.
- **Do not mix Route Handlers and Server Actions for the same data operation** — pick one per feature and stay consistent.

## References

- Next.js App Router: https://nextjs.org/docs/app
- Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- `output: "standalone"`: https://nextjs.org/docs/app/api-reference/next-config-js/output
- Dynamic rendering: https://nextjs.org/docs/app/building-your-application/rendering/server-components#dynamic-rendering
