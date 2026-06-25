---
name: tanstack-query
description: Use when adding queries or mutations, defining query keys, writing entity api/ query factories, or wiring server prefetch + HydrationBoundary. Covers the SSR-safe QueryClient setup and key conventions this repo depends on.
---

# TanStack Query

**Source of truth:** [`docs/stack/tanstack-query.md`](../../../docs/stack/tanstack-query.md). In this frontend repo TanStack carries the full data-fetching workload (RSC prefetch → `HydrationBoundary` → client `useQuery`).

## Load-bearing rules

- **Don't simplify `getQueryClient()`** (`src/shared/api/query-client.ts`). It returns a **per-request** client on the server (React `cache()`, guarded by `isServer`) and a **module singleton** in the browser. Collapsing the `isServer` branches leaks state across requests (server) or breaks cache persistence (client).
- **Keep the `pending` branch in `shouldDehydrateQuery`** — required for Suspense streaming.
- **Never create a `QueryClient` inside a component** — call `getQueryClient()`.
- **Query factories live in the entity `api/` segment.** Define a hierarchical `*Keys` object and export `*Queries` via `queryOptions()`. Reuse the same `queryOptions` object for `prefetchQuery` (server) and `useQuery` (client) so keys always match.
- **Never put query keys as plain strings at call sites** — go through the `*Keys` factory so invalidations stay consistent.
- **Don't use `useQuery` in Server Components.** Server prefetches with `queryClient.prefetchQuery(...)` and passes data via `dehydrate()` + `<HydrationBoundary>`; a `"use client"` component reads with `useQuery`.
- The `queryFn` uses the Zod fetcher `getValidated("posts", PostsSchema)` — see the `ky-http-client` skill.
