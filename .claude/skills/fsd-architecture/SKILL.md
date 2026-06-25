---
name: fsd-architecture
description: Use when adding, moving, or renaming files under src/, editing any index.ts public API, touching imports between FSD layers, or using the @x cross-entity protocol. Enforces the Feature-Sliced Design layer rules this repo is built on.
---

# FSD architecture

**Source of truth:** [`docs/stack/fsd.md`](../../../docs/stack/fsd.md) — read it before non-trivial structural changes. The rules below are the ones most often violated.

## Layer order (import only downward)

`src/app → src/pages → src/widgets → src/features → src/entities → src/shared`

A layer may import only from **strictly lower** layers. Same-layer cross-slice imports are **forbidden** — the one exception is the entity `@x` protocol.

## Load-bearing rules

- **Public API per slice via `index.ts`, named exports only.** Never `export *`. Never import from a slice's internals (`@/entities/post/api/post-queries`) from outside — go through its `index.ts`.
- **Next routing lives at the root `app/`**, as thin re-export files only. Real page logic lives in `src/pages/*/ui/`. Don't put business logic in root `app/`.
- **Root `pages/` stays an empty placeholder** (`.gitkeep`). Adding route files there makes Next ignore the FSD `src/pages` layer. Don't add files under it.
- **`@x` is entity→entity type-sharing only.** `src/entities/user/@x/session.ts` re-exports exactly what `entities/session` needs. It is not a general escape hatch for layer violations.
- **`src/shared` is relaxed** — organised by concern (`api`, `lib`, `ui`, `config`), not slices. `public-api`/`no-segmentless-slices` are disabled for `shared/**`. Don't add segment folders when a flat file (`shared/lib/utils.ts`) suffices.
- Add `export const dynamic = "force-dynamic"` to the root `app/` route file when the FSD page does runtime API/DB calls (see `app/dashboard/page.tsx`).

## Verify

`pnpm lint:fsd` (Steiger) — Steiger understands `@x` and won't flag it. For a deeper audit of a diff, dispatch the **`fsd-compliance`** subagent.
