# Zod

**Pinned:** `zod` 4.4.3

## What & why

Zod is the single schema and validation library across both boilerplates. It serves three distinct roles: (1) form input validation via `zodResolver`, (2) Server Action / fetch-wrapper re-validation at the network boundary, and (3) — in B only — runtime validation of external API responses to detect contract drift early.

## Conventions / rules

**Schema location:**

- Form schemas → `src/features/<feature>/model/schema.ts`
- API response schemas → `src/entities/<entity>/api/<entity>-queries.ts` (defined inline, close to the `queryFn`)

**Standard schema + type pattern:**

```ts
// src/features/auth/model/schema.ts  (identical in A and B)
import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email(),      // error: "Invalid email address"
  password: z.string().min(8),
});
export type SignInInput = z.infer<typeof signInSchema>;
```

Always export the inferred type alongside the schema. Use `z.infer<typeof schema>` — never write the type manually.

**Zod 4 message changes to know:**
- `z.string().email()` → `"Invalid email address"` (not "Invalid email")
- `z.string().url()` → `"Invalid url"` (used in `env.ts` for `DATABASE_URL`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_API_URL`)

**Two-layer validation (both boilerplates):**
Client-side: `zodResolver(schema)` via RHF. Server-side: `schema.parse(input)` in the action or fetch wrapper before any DB/network call.

```ts
// A: src/features/auth/api/sign-in.ts  (Server Action)
export async function signInAction(input: SignInInput) {
  const parsed = signInSchema.parse(input);  // re-validates untrusted input
  await auth.api.signInEmail({ body: parsed });
}
```

**B adds a third layer — validated fetcher:**

```ts
// src/shared/api/fetcher.ts
export async function getValidated<T>(
  path: string, schema: ZodType<T>, options?: Options, client = http,
): Promise<T> {
  const json = await client.get(path, options).json<unknown>();
  return schema.parse(json);  // throws if external API drifts from expected shape
}
```

Query factories in B pass their response schema directly to `getValidated`:

```ts
// src/entities/post/api/post-queries.ts  (B only)
export const PostSchema = z.object({ id: z.string(), title: z.string(), body: z.string() });
export const PostsSchema = z.array(PostSchema);
export type Post = z.infer<typeof PostSchema>;

export const postQueries = {
  list: () => queryOptions({
    queryKey: postKeys.list(),
    queryFn: () => getValidated("posts", PostsSchema),
  }),
};
```

**A does not have `getValidated`** — it reads the DB through Drizzle and the shape is already typed via the ORM schema.

## Best practices

- Co-locate form schemas in `model/schema.ts` so the form component and the action import from the same source of truth.
- Export `z.infer<typeof schema>` types; use them as function argument types in actions and fetch wrappers.
- In B, define entity-level response schemas in the entity's `api/` file next to `queryOptions` — the schema and query factory travel together.
- Use `z.string().url()` for URL-shaped env vars (see `env.ts` in both boilerplates).

## Anti-patterns

- **Do not** write TypeScript types that duplicate a schema — derive them with `z.infer`.
- **Do not** skip `.parse()` in Server Actions or API routes because "the client already validated" — those endpoints are callable directly.
- **Do not** place schemas in a component file; always `model/schema.ts` or the entity `api/` segment.
- **Do not** use `z.any()` for API responses in B — if the shape is unknown, define a minimal schema and expand it incrementally.
- **Do not** suppress Zod errors by wrapping `.parse()` in an empty `catch` — let them propagate so they surface as visible failures.

## References

- https://zod.dev/
- https://zod.dev/api?id=strings
- https://github.com/react-hook-form/resolvers#zod
