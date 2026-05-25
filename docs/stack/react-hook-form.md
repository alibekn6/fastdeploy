# React Hook Form

**Pinned:** `react-hook-form` ^7.76.1, `@hookform/resolvers` ^5.4.0

## What & why

React Hook Form handles form state, validation wiring, and submission with minimal re-renders. It is the only form solution in both boilerplates. Schemas are defined with Zod and passed via `zodResolver` — there is no separate validation library and no manual `onChange` plumbing.

## Conventions / rules

**File layout (FSD):**

```
src/features/<feature>/
  model/schema.ts       ← Zod schema + inferred type
  ui/<Feature>Form.tsx  ← form component ("use client")
  api/<action>.ts       ← Server Action (A) or fetch wrapper (B)
```

**Standard form pattern** — identical in A and B:

```tsx
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { type SignInInput, signInSchema } from "../model/schema";

export function SignInForm() {
  const emailId = useId();
  const passwordId = useId();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  return (
    <form onSubmit={handleSubmit(async (values) => { /* call API */ })}>
      <Label htmlFor={emailId}>Email</Label>
      <Input id={emailId} type="email" {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}
      <Button type="submit" disabled={isSubmitting}>Sign in</Button>
    </form>
  );
}
```

Real file: `src/features/auth/ui/sign-in-form.tsx` (same code in A and B).

**Element id rule — `useId()` is mandatory.**
Biome's `useUniqueElementIds` lint rule forbids hardcoded ids. Every form field allocates its id with React's `useId()` hook and associates it via `htmlFor={id}` / `id={id}`. See `SignInForm` for the exact pattern.

**A also has `CreatePostForm`** (`src/features/create-post/ui/create-post-form.tsx`): a compact inline form with `reset()` after successful submission. Its schema (`src/features/create-post/model/schema.ts`) is a single-line `z.object({ title: z.string().min(1), content: z.string().min(1) })`.

**Submission in A vs B:**

| | A (fullstack) | B (frontend) |
|---|---|---|
| `handleSubmit` calls | `signInAction(values)` — a `"use server"` Server Action | `signIn(values)` — a `fetch` wrapper |
| Zod parse in the action | `signInSchema.parse(input)` re-validates on the server | `signInSchema.parse(input)` re-validates before `fetch` |

Both boilerplates parse at the network boundary even though RHF already validated client-side. This is intentional: Server Actions and fetch wrappers can be called directly, so they must not trust their input.

## Best practices

- Pass `isSubmitting` to the submit button's `disabled` prop to prevent double-submission.
- Use `reset()` after successful mutations that should clear the form (see `CreatePostForm`).
- Keep the schema in `model/schema.ts`; import it into both the form (for `zodResolver`) and the action (for `.parse()`).
- Destructure only what you need from `useForm` — keep the component readable.
- Always use `useId()` for element ids; never hardcode them.

## Anti-patterns

- **Do not** use uncontrolled `useState` for field values — let RHF manage state.
- **Do not** skip the `zodResolver` and write manual validation — that duplicates the schema.
- **Do not** hardcode element ids (`id="email"`) — Biome will error and the ids are not unique across multiple form instances.
- **Do not** place the `<form>` component in a page or widget layer; forms belong in a feature's `ui/` segment.
- **Do not** trust client-validated data in Server Actions or fetch wrappers — always re-parse with `.parse()` at the boundary.

## References

- https://react-hook-form.com/docs/useform
- https://github.com/react-hook-form/resolvers#zod
- https://biomejs.dev/linter/rules/use-unique-element-ids/
