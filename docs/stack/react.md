# React

## What & why

Both boilerplates run React 19.2 with Next.js App Router. The default rendering mode is **React Server Components (RSC)** — components are server-rendered and stream HTML unless explicitly opted into the client. This means most FSD slices ship zero client-side JavaScript by default. `"use client"` is added only at interactive leaves, keeping the client bundle small and data-fetching close to the source.

## Conventions / rules

### Server Components by default

Any component without a `"use client"` directive is a Server Component. Both `DashboardPage` implementations are server components:

- **Fullstack** (`src/pages/dashboard/ui/dashboard-page.tsx`): async function, calls `await listPosts()` (direct Drizzle query), renders the result.
- **Frontend** (`src/pages/dashboard/ui/dashboard-page.tsx`): synchronous function, prefetches via `queryClient.prefetchQuery(postQueries.list())`, wraps the list in `HydrationBoundary`.

Neither carries a `"use client"` directive.

### `"use client"` only at interactive leaves

Components that use hooks (`useState`, `useRouter`, `useQuery`, event handlers) must be client components. In this codebase:

| File | Why `"use client"` |
|---|---|
| `src/features/auth/ui/sign-in-form.tsx` | `useForm`, `useRouter`, `handleSubmit` |
| `src/features/create-post/ui/create-post-form.tsx` | `useForm`, `handleSubmit` |
| `src/widgets/header/ui/header.tsx` | `useRouter`, `onClick` handler |
| `src/pages/dashboard/ui/post-list.tsx` (frontend) | `useQuery` |
| `src/app/providers/query-provider.tsx` | `QueryClientProvider` (React context) |
| `src/app/providers/msw-provider.tsx` (frontend) | `useEffect`, `useState` |

`QueryProvider` and `MswProvider` are client components because they establish React context. They are composed in `app/layout.tsx` (the server root) as the outermost wrappers, so their client boundary is as high as needed but as narrow as possible.

### Server Actions

In the fullstack repo, mutations are Server Actions (`"use server"`):

```ts
// src/features/create-post/api/create-post.ts
"use server";
export async function createPostAction(input: CreatePostInput) { … }
```

A `"use client"` form calls the action directly:
```ts
// create-post-form.tsx — client component
onSubmit={handleSubmit(async (v) => { await createPostAction(v); reset(); })}
```

Server Actions run on the server; only their serialisable arguments cross the network. Validation happens server-side with Zod before any DB write.

### React Query + RSC hydration (frontend repo)

The frontend repo uses TanStack Query v5's `HydrationBoundary` pattern:

```ts
// DashboardPage (Server Component)
const queryClient = getQueryClient();
void queryClient.prefetchQuery(postQueries.list());
return <HydrationBoundary state={dehydrate(queryClient)}><PostList /></HydrationBoundary>;

// PostList (Client Component)
const { data } = useQuery(postQueries.list());
```

The server prefetches, dehydrates, and sends the cache to the client. The client hydrates from it — no waterfall, no loading spinner on first paint.

### `useId` for accessible forms

Form label–input associations use `useId()` to get stable SSR-safe IDs:

```ts
// src/features/auth/ui/sign-in-form.tsx
const emailId = useId();
<Label htmlFor={emailId}>Email</Label>
<Input id={emailId} ... />
```

This avoids the hydration mismatch that `Math.random()` causes.

### Providers composition

```tsx
// app/layout.tsx (frontend)
<MswProvider>
  <QueryProvider>{children}</QueryProvider>
</MswProvider>
```

`MswProvider` starts the service worker (dev/mock mode only) and renders children immediately — it does **not** gate render, which would suppress the server-rendered body; the "no fetch before the worker is live" invariant lives in the ky `beforeRequest` hook. `QueryProvider` owns the React Query client. Both are pure wrappers; no business logic lives here.

## ✅ Best practices

- Default to Server Components; add `"use client"` only when you need hooks or browser APIs.
- Keep client boundaries at leaves — push `"use client"` as deep as possible in the tree.
- Use `HydrationBoundary` + `prefetchQuery` (frontend) to avoid loading states on initial render.
- Use Server Actions (fullstack) for all form mutations — they keep auth and DB logic on the server without a separate API route.
- Use `useId()` for form-field IDs to ensure SSR/hydration consistency.

## ❌ Worst practices / anti-patterns

- **Do not mark a component `"use client"` just because it imports a client component** — Next.js handles the boundary; the parent can stay a server component.
- **Do not call `getQueryClient()` inside a client component** — the singleton is safe only in server context; client components receive it from `QueryClientProvider` via `useQueryClient()`.
- **Do not `await` a Server Action directly from another Server Component** — Server Actions are designed for client→server calls; for server-side data access, call the underlying function directly.
- **Do not place `"use server"` and `"use client"` in the same file** — they are module-level directives and are mutually exclusive.
- **Do not skip the `dehydrate`/`HydrationBoundary` wrapper** when prefetching in a Server Component for a client `useQuery` — the client will re-fetch and cause a waterfall.

## References

- React Server Components: https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components
- Next.js RSC: https://nextjs.org/docs/app/building-your-application/rendering/server-components
- TanStack Query SSR / hydration: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
- Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- `useId`: https://react.dev/reference/react/useId
