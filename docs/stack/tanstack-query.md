# TanStack Query

**Pinned:** `@tanstack/react-query` 5.100.14, `@tanstack/react-query-devtools` 5.100.14

## What & why

TanStack Query manages async server state — caching, background refetching, deduplication, and SSR hydration. Both boilerplates share identical `query-client.ts` and `QueryProvider` implementations. In **A (fullstack)** the dashboard page reads the DB directly as an RSC (`listPosts()`), so TanStack is kept mainly for parity and client-side mutations. In **B (frontend)** it carries the full data-fetching workload: the RSC prefetches into a `HydrationBoundary` and a `"use client"` component reads via `useQuery`.

## Conventions / rules

**Client factory — do not simplify:**
`src/shared/api/query-client.ts` exports two things:

- `makeQueryClient()` — creates a `QueryClient` with `staleTime: 60 000 ms` and a custom `shouldDehydrateQuery` that also dehydrates `"pending"` queries (required for streaming RSC).
- `getQueryClient()` — returns a **per-request** client on the server (via React `cache()`, guarded by `isServer`) and a **module singleton** on the browser. These two paths must stay separate; collapsing them breaks either SSR isolation or client-side cache persistence.

**Provider:**
`src/app/providers/query-provider.tsx` is a `"use client"` component that wraps children with `QueryClientProvider` and mounts `ReactQueryDevtools` (`initialIsOpen={false}`). It calls `getQueryClient()` — the singleton path is safe here because the component only runs in the browser.

**Query factories (entity `api/` segment):**
Define query keys with a hierarchical `*Keys` object and export a `*Queries` map using `queryOptions()`:

```ts
// src/entities/post/api/post-queries.ts  (same shape in A and B)
export const postKeys = {
  all: ["posts"] as const,
  list: () => [...postKeys.all, "list"] as const,
};
export const postQueries = {
  list: () => queryOptions({ queryKey: postKeys.list(), queryFn: listPosts }),
};
```

Keys are defined inline as `["posts", "list"]` — never as plain strings scattered across files. Factories live in the entity's `api/` segment, not inside a widget or page.

**A vs B — dashboard data flow:**

| | A (fullstack) | B (frontend) |
|---|---|---|
| Dashboard page | `async` RSC, `await listPosts()` directly from DB | non-async RSC, calls `queryClient.prefetchQuery(postQueries.list())` |
| Client component | none needed for initial render | `PostList` (`"use client"`) calls `useQuery(postQueries.list())` |
| `HydrationBoundary` | not used | wraps `<PostList />` with `state={dehydrate(queryClient)}` |

B's `queryFn` in `post-queries.ts` uses `getValidated("posts", PostsSchema)` (Zod-validated fetcher) rather than a direct DB call.

## Best practices

- Keep query factories in the entity's `api/` segment so pages and widgets stay ignorant of fetch details.
- Reuse `postQueries.list()` everywhere — `prefetchQuery` on the server and `useQuery` on the client receive the same `queryOptions` object, so keys always match.
- Use `dehydrate(queryClient)` + `<HydrationBoundary>` in B to pass server-prefetched data to client components without an extra network round-trip.
- Access devtools by pressing the TanStack Query logo that appears in development; `ReactQueryDevtools` is already mounted by `QueryProvider`.

## Anti-patterns

- **Do not** collapse the `isServer` branches in `getQueryClient()`. Using a module-level singleton on the server leaks state between requests.
- **Do not** create a new `QueryClient` inside a component — call `getQueryClient()` instead.
- **Do not** put query keys as plain strings at call sites; always go through the `*Keys` factory so invalidations stay consistent.
- **Do not** remove the `pending` branch from `shouldDehydrateQuery` — it is required for Suspense streaming to work correctly.
- **Do not** use `@tanstack/react-query` in Server Components — call data functions directly (pattern A) or use `prefetchQuery` + `HydrationBoundary` (pattern B).

## References

- https://tanstack.com/query/v5/docs/framework/react/guides/ssr
- https://tanstack.com/query/v5/docs/framework/react/guides/query-options
- https://tanstack.com/query/v5/docs/framework/react/reference/hydration
