# Feature-Sliced Design (FSD)

## What & why

FSD is the primary codebase architecture in both boilerplates. It enforces a strict one-directional dependency graph across named layers, eliminating the "ball of mud" that grows in feature-heavy Next.js projects. Every layer has a narrowly-defined responsibility, so deleting a feature means deleting a folder, not hunting scattered imports.

Both repos (`nextjs-fullstack` / `nextjs-frontend`) place FSD layers under `src/` with an identical layer set:
`src/app` → `src/pages` → `src/widgets` → `src/features` → `src/entities` → `src/shared`

## Conventions / rules

**Layers (top → bottom)**

| Layer | Responsibility |
|---|---|
| `src/app` | Global providers, styles, FSD-side route-handler glue (`api-routes/`) |
| `src/pages` | Full page components composed from widgets/features/entities |
| `src/widgets` | Composite UI blocks reused across pages (e.g. `Header`) |
| `src/features` | User-interaction slices (`auth`, `create-post`) |
| `src/entities` | Business objects with their model, api, ui segments (`post`, `user`, `session`) |
| `src/shared` | Infra with no business logic: `ui`, `lib`, `config`, `api` |

**A layer may only import from strictly-lower layers.** Same-layer cross-slice imports are forbidden except for the `@x` protocol (see below).

**Public API per slice via `index.ts`.** No `export *` — every export is explicit. Example:
- `src/entities/session/index.ts` exports `Session` type and `isAuthenticated` function.
- `src/entities/user/index.ts` exports only `User` type.

**Segments inside a slice:** `ui/` `model/` `api/` `lib/` `config/`. Not all segments are required.

### FSD ↔ Next App Router integration

Next.js routing lives at the project **root** `app/` directory (outside `src/`). These are thin re-export files, not real page logic:

```ts
// app/page.tsx
export { HomePage as default } from "@/pages/home";

// app/dashboard/page.tsx
export const dynamic = "force-dynamic";
export { DashboardPage as default } from "@/pages/dashboard";
```

The real page implementations are in `src/pages/*/ui/`. An empty `pages/.gitkeep` exists at the root. **Reason:** Next.js resolves route directories only from the project root; if both a root `app/` and a root `pages/` exist, Next ignores `src/app` and `src/pages` as route directories. This prevents FSD layer names from colliding with Next's routing conventions.

### `@x` cross-entity imports

When two entity slices genuinely depend on each other's types, use the `@x` protocol instead of importing from another entity's public `index.ts`:

```
src/entities/user/@x/session.ts   ← re-exports only what session needs
src/entities/session/model/session.ts
  └─ import type { User } from "@/entities/user/@x/session"
```

`src/entities/user/@x/session.ts` contains exactly:
```ts
export type { User } from "../model/types";
```

The consumer (`entities/session`) imports from `@x/session`, not from `@/entities/user`. This makes the coupling explicit and unidirectional. Steiger understands `@x` and does not flag it as a violation.

### `src/shared` relaxed rules

`shared` has no "slices" in the FSD sense; it organises by concern: `shared/api/db`, `shared/api/auth`, `shared/ui`, `shared/lib`, `shared/config`. Because these are folders acting as cohesive modules (not slices), the `fsd/public-api` and `fsd/no-segmentless-slices` rules are disabled for `src/shared/**` in `steiger.config.ts`.

## ✅ Best practices

- Place all feature logic in `src/features/<name>/`, not inside the Next `app/` directory.
- Every slice must expose a public `index.ts`; import other slices only via that index (or `@x`).
- Keep `app/` route files as single-line re-exports — any logic belongs in `src/`.
- Add `export const dynamic = "force-dynamic"` in the root `app/` route file when the FSD page component performs runtime DB / API calls (see `app/dashboard/page.tsx`).
- Route handlers follow the same pattern: `app/api/posts/route.ts` → `src/app/api-routes/posts.ts` → calls `src/entities/post`.

## ❌ Worst practices / anti-patterns

- **Do not put business logic in root `app/`** — those files are glue only.
- **Do not import across same-layer slices** (`features/auth` importing `features/create-post`).
- **Do not bypass `index.ts`** — never `import { foo } from "@/entities/post/api/post-queries"` from outside the slice.
- **Do not use `@x` as a general escape hatch** — it is only for entity→entity type sharing where a direct lower-layer import would create a cycle.
- **Do not add segment folders to `shared`** if a flat file suffices — `shared/lib/utils.ts` not `shared/lib/utils/index.ts`.
- **Do not use `export *`** in any `index.ts` — explicit named exports only.

## References

- FSD documentation: https://feature-sliced.design/docs
- `@x` cross-import protocol: https://feature-sliced.design/docs/reference/public-api#x-notation
- Steiger FSD plugin: https://github.com/feature-sliced/steiger
