# shadcn/ui

## What & why

shadcn/ui is not a component library you install as a dependency — it is a CLI that copies
unstyled, fully editable React components into your source tree. Components are yours from the
moment they land: modify them freely without fighting an upstream API. All components are styled
with Tailwind utility classes, use CSS variables for theming, and come pre-wired with Radix UI
primitives. The boilerplate uses the **new-york** style variant, which has slightly tighter spacing
and rounded corners compared to the default style.

Pinned / relevant versions: `lucide-react@^1.16.0`, `class-variance-authority@^0.7.1`,
`clsx@^2.1.1`, `tailwind-merge@^3.6.0`.

## Conventions / rules

**`components.json` — pre-created to target FSD paths**

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/shared/ui",
    "ui": "@/shared/ui",
    "lib": "@/shared/lib",
    "utils": "@/shared/lib/utils",
    "hooks": "@/shared/lib/hooks"
  },
  "iconLibrary": "lucide"
}
```

Key decisions baked into this file:
- `"tailwind.config": ""` — signals Tailwind v4 (no JS config file).
- `"css": "src/app/styles/globals.css"` — the CLI injects shadcn colour tokens into the project's
  `@theme` block here.
- `aliases.ui` + `aliases.components` both resolve to `@/shared/ui` so every component lands
  in `src/shared/ui/` — the correct FSD shared layer, not a root-level `components/` folder.
- `"iconLibrary": "lucide"` — component code imports from `lucide-react`.

**Components live in `src/shared/ui/`**

Currently installed: `button.tsx`, `card.tsx`, `form.tsx`, `input.tsx`, `label.tsx`.

Each component is a plain React function; edit freely. Variants are expressed with `cva`
(class-variance-authority) — see `button.tsx` for a representative example.

**The `cn` helper — `src/shared/lib/utils.ts`**

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`cn` is the standard merge helper. Use it anywhere class strings need to be composed or overridden.
It is also recognised by Biome's `useSortedClasses` nursery rule.

**Adding a new component**

```bash
pnpm dlx shadcn add <component-name>
```

The CLI reads `components.json` and writes the file to `src/shared/ui/`. Do NOT run `shadcn init`
again — it is interactive and will prompt to overwrite `components.json`, which would reset the FSD
aliases. If `shadcn add` does not generate `src/shared/lib/utils.ts` (it may skip it if the file
exists), create or verify it manually using the snippet above.

**FSD placement rules**

- Shared primitives (button, input, card, …) → `src/shared/ui/`.
- Feature-specific compound components → the feature slice that owns them, not `shared/ui`.
- Never import `shared/ui` components from a lower FSD layer (entities, features may import shared;
  not the reverse).

## ✅ Best practices

- Run `pnpm dlx shadcn add <comp>` to add components; let the CLI handle Radix deps.
- Customise variant styles inside `cva(...)` blocks rather than overriding via `className` at every
  call site.
- Use `asChild` (via Radix `Slot`) on `Button` to compose it with router links without extra DOM
  wrappers.
- Keep `components.json` committed and unchanged — it is the contract between the CLI and the repo
  layout.

## ❌ Worst practices / anti-patterns

- **Do not run `shadcn init`** — it will prompt to overwrite `components.json` and break FSD
  aliases.
- Do not move components out of `src/shared/ui/` unless they are genuinely feature-specific.
- Do not install `@shadcn/ui` as an npm dependency — there is no such package; it is CLI-only.
- Do not duplicate the `cn` helper in other files; always import from `@/shared/lib/utils`.
- Do not inline `twMerge(clsx(...))` directly; use `cn`.

## References

- https://ui.shadcn.com/docs (official docs)
- https://ui.shadcn.com/docs/components (component list)
- https://ui.shadcn.com/docs/cli (CLI reference)
- https://cva.style/docs (class-variance-authority)
