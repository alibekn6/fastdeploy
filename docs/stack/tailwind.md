# Tailwind CSS

## What & why

Tailwind CSS v4 is the utility-first CSS framework used throughout this boilerplate. Version 4 is a
ground-up rewrite that drops the JavaScript config file in favour of a **CSS-first** approach: all
design tokens live directly in `src/app/styles/globals.css` as native CSS custom properties under a
`@theme` block. This eliminates the `tailwind.config.js/ts` file entirely, keeps tokens co-located
with the stylesheet, and makes the build pipeline leaner — PostCSS is the only integration layer.

Pinned version: `tailwindcss@^4.3.0`, `@tailwindcss/postcss@^4.3.0`.

## Conventions / rules

**Entry point — `src/app/styles/globals.css`**

```css
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

@theme {
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(240 10% 3.9%);
  --color-primary: hsl(240 5.9% 10%);
  --color-primary-foreground: hsl(0 0% 98%);
  --radius: 0.625rem;
}
```

- `@import "tailwindcss"` replaces the old `@tailwind base/components/utilities` directives.
- `@custom-variant dark (...)` wires up the `.dark` class strategy used by shadcn/ui.
- The `@theme` block ships **intentionally minimal** — only the tokens shadcn/ui's base palette
  needs. Adding new design tokens means adding CSS variables here, not touching any JS config.

**PostCSS — `postcss.config.mjs`**

```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

The sole PostCSS plugin is `@tailwindcss/postcss`. There is no `autoprefixer` (v4 handles
prefixing internally).

**No `tailwind.config.js/ts` file** — if you find one in this repo it is a mistake; delete it.

**FSD placement:** utility classes are applied directly in component files inside the relevant FSD
slice (e.g. `src/shared/ui/button.tsx`). No shared CSS utility layers are hand-crafted; prefer
`@theme` tokens + Tailwind utilities.

**Dark mode** is class-based via the `@custom-variant dark (&:is(.dark *))` declaration. Toggle by
adding/removing the `dark` class on a DOM ancestor.

## ✅ Best practices

- Extend the design system by adding CSS variables under `@theme` in `globals.css`.
- Use semantic token names (`--color-primary`, `--color-background`) rather than raw colour values
  inside component classes.
- Compose utilities through `cva` + `cn` (see `src/shared/lib/utils.ts`) rather than concatenating
  class strings manually.
- Keep `globals.css` as the single source of truth for tokens; do not duplicate values in
  component-level `style` props.

## ❌ Worst practices / anti-patterns

- **Do not create `tailwind.config.js/ts`** — v4 does not use it; shadcn's `components.json` sets
  `"tailwind.config": ""` explicitly for this reason.
- Do not add `autoprefixer` to PostCSS; v4 handles vendor prefixes natively.
- Do not use the old `@tailwind` directives (`@tailwind base`, etc.); use `@import "tailwindcss"`.
- Do not hard-code colour values in `className` strings when a `@theme` token already exists.
- Do not add arbitrary `[color:#abc]` values for colours that should be design tokens.

## References

- https://tailwindcss.com/docs/v4-beta (v4 overview)
- https://tailwindcss.com/docs/theme (CSS-first `@theme` configuration)
- https://tailwindcss.com/docs/dark-mode (`@custom-variant` dark mode)
- https://tailwindcss.com/docs/using-with-preprocessors#postcss (PostCSS setup)
