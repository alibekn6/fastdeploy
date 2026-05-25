# TypeScript

## What & why

Both boilerplates use TypeScript 5.x in strict mode with additional pedantic flags beyond `strict: true`. The goal is to eliminate entire classes of runtime errors at compile time — particularly index-access bugs and accidental override omissions. A shared `tsconfig.base.json` (synced from `tooling/`) defines all compiler options; each repo's `tsconfig.json` extends it and adds the `@/*` path alias.

## Conventions / rules

### Config structure

`tsconfig.json` (per-repo, not checked into `tooling/`):
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": { "paths": { "@/*": ["./src/*"] } },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`tsconfig.base.json` (synced from `tooling/shared/`):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "incremental": true,
    "allowJs": true,
    "noEmit": true,
    "plugins": [{ "name": "next" }]
  }
}
```

### Key flags explained

**`moduleResolution: "bundler"`** — resolves imports the same way Vite/Turbopack does (no `.js` extension required, `exports` field in `package.json` is honoured). Use bare specifiers: `import { foo } from "@/shared/lib/utils"`.

**`noUncheckedIndexedAccess: true`** — array subscript and index-signature access returns `T | undefined`, not `T`. Code **must** narrow before use:

```ts
// Error without narrowing:
const items = await listPosts(); // Post[]
const first = items[0];         // Post | undefined
first.title;                    // TS error: 'first' is possibly 'undefined'

// Correct pattern (fullstack src/features/create-post/api/create-post.ts uses this indirectly):
const [row] = await db.select()…;
if (!row) throw new Error("not found");
row.title; // Post — safe
```

**`noImplicitOverride: true`** — class methods that override a base class method must use the `override` keyword. This surfaces accidental shadowing in class hierarchies (rare in this codebase, but enforced by default).

**`isolatedModules: true`** — each file is compiled independently (required by Turbopack). Consequence: `export { Foo }` where `Foo` is a type must be written `export type { Foo }`. All `index.ts` files in the repos already use `export type { … }` for type-only exports.

### Path alias `@/*`

`@/*` maps to `./src/*` in both repos. Use it for all cross-layer imports:

```ts
import type { User } from "@/entities/user/@x/session";
import { routes } from "@/shared/config/routes";
import { getQueryClient } from "@/shared/api/query-client";
```

Never use relative paths to cross layer boundaries (`../../../entities/…`). Within a slice, relative imports (`./model/schema`, `../ui/form`) are fine.

### Type-only exports in `index.ts`

Because of `isolatedModules`, every public API file uses explicit type-only exports where applicable:

```ts
// src/entities/user/index.ts
export type { User } from "./model/types";

// src/entities/session/index.ts
export type { Session } from "./model/session";
export { isAuthenticated } from "./model/session";
```

### `typecheck` command

```bash
pnpm typecheck   # tsc --noEmit
```

Runs in CI and in the pre-commit hook (unless `SKIP_TSC=1`). Must pass before merging. Vitest uses `vite-tsconfig-paths` to pick up the same `@/*` alias during tests.

## ✅ Best practices

- Narrow every array subscript and optional index access before use — `noUncheckedIndexedAccess` will reject unnarrowed code at compile time.
- Use `export type { … }` in `index.ts` for types; never rely on type-erasure inference.
- Use bare `@/*` aliases for cross-layer imports; keep relative paths only for intra-slice files.
- Pass `SKIP_ENV_VALIDATION=1` when running `tsc --noEmit` or builds without a full `.env` file (e.g. CI, Docker build stage).
- Prefer `satisfies` over `as` for typed literals — it keeps inference without widening.

## ❌ Worst practices / anti-patterns

- **Do not use `as unknown as T` to silence type errors** — fix the underlying type mismatch.
- **Do not add `// @ts-ignore` or `// @ts-expect-error` without a comment** explaining why it's necessary.
- **Do not use `any`** — prefer `unknown` and narrow, or `never` for exhaustive checks.
- **Do not use relative cross-layer imports** (`import { foo } from "../../../shared/…"`) — always use `@/*`.
- **Do not skip `export type`** for type-only exports in `isolatedModules` mode — the build will fail in Turbopack.
- **Do not override base class methods without `override`** — `noImplicitOverride` will error, and silent shadowing is a bug waiting to happen.

## References

- TypeScript strict flags: https://www.typescriptlang.org/tsconfig#strict
- `noUncheckedIndexedAccess`: https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess
- `moduleResolution: "bundler"`: https://www.typescriptlang.org/tsconfig#moduleResolution
- `isolatedModules`: https://www.typescriptlang.org/tsconfig#isolatedModules
- Next.js TypeScript: https://nextjs.org/docs/app/building-your-application/configuring/typescript
