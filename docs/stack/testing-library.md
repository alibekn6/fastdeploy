# Testing Library

**Pinned:** `@testing-library/react` 16.3.2, `@testing-library/jest-dom` 6.9.1, `@testing-library/user-event` 14.6.1, `@testing-library/dom` 10.4.1

## What & why

Testing Library provides the component-testing layer for both boilerplates. `@testing-library/react` renders components into a jsdom DOM, `@testing-library/jest-dom` extends Vitest's `expect` with DOM matchers (`toBeInTheDocument`, `toHaveValue`, …), and `@testing-library/user-event` simulates realistic user interactions (pointer events, focus, keyboard) rather than synthetic dispatches. The philosophy — test what the user sees, not implementation details — aligns naturally with FSD's UI segments.

## Conventions / rules

**Matchers loaded once in the unit setup file:**
`vitest.setup.ts` in both boilerplates imports `@testing-library/jest-dom/vitest` at the top. This is the Vitest-specific entry point (uses `expect` from `vitest`, not Jest). It must stay in `vitest.setup.ts`, not in individual test files.

```ts
// vitest.setup.ts (A: src/shared/testing/msw/server, B: @/shared/api/mocks/node)
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "...";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
```

`cleanup()` is called in every `afterEach` to unmount rendered trees. This prevents state leaking between tests and avoids the "multiple renders" false positive.

**MSW is the mock boundary for unit tests:**
Both setups call `server.listen({ onUnhandledRequest: "error" })` in `beforeAll`. Any fetch that escapes the handler list will throw — this keeps tests honest. Add per-test overrides with `server.use(...)` rather than silencing the error.

**A's MSW server location vs B's:**

| | A (fullstack) | B (frontend) |
|---|---|---|
| Node server | `src/shared/testing/msw/server.ts` | `src/shared/api/mocks/node.ts` |
| Handlers | `src/shared/testing/msw/handlers.ts` (placeholder `/api/health`) | `src/shared/api/mocks/handlers.ts` (auth, posts, users) |
| Import in setup | `./src/shared/testing/msw/server` (relative, no alias) | `@/shared/api/mocks/node` (alias) |

B's handlers are the single source of mock data shared across unit tests, integration tests, dev mode (browser worker via `MswProvider`), and E2E (Next.js `instrumentation.ts`). A's unit-test handlers are a placeholder; real external calls do not exist in the fullstack boilerplate's unit tests.

**Query strategy — roles and labels first:**
Use `getByRole`, `getByLabelText`, and `findBy*` (async). Fall back to `getByText` only when a visible role does not exist. Never use `getByTestId` unless accessibility selectors are genuinely impossible.

**Real example — `SignInForm` (A: `src/features/auth/ui/sign-in-form.test.tsx`):**

```tsx
vi.mock("../api/sign-in", () => ({ signInAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { SignInForm } from "./sign-in-form";

describe("SignInForm", () => {
  it("shows validation errors on empty submit", async () => {
    render(<SignInForm />);
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
  });
});
```

Key points: server action (`signInAction`) and `useRouter` are mocked before the component import; Zod client-side validation fires without a server round-trip; `findByText` is awaited because the error appears asynchronously after the user-event click settles.

**B's unit test — `postKeys` (B: `src/entities/post/api/post-queries.test.ts`):**
Pure logic test, no render needed. Asserts the TanStack Query key factory shape (`["posts", "list"]`) so any refactor that silently changes key structure breaks the test.

## Best practices

- Always `await userEvent.click(...)` and `await screen.findBy*(...)` for interactions that trigger async state changes. `userEvent` is async by design in v14.
- Mock framework modules (`next/navigation`, `next/headers`) with `vi.mock` before importing the component under test. Vitest hoists `vi.mock` calls, so the declaration order in the file is irrelevant, but keeping them at the top aids readability.
- Keep component tests in the same FSD segment as the component (`features/auth/ui/sign-in-form.test.tsx` next to `sign-in-form.tsx`).
- Use `describe` blocks to group a component's scenarios; each `it` should cover one user-observable outcome.

## Anti-patterns

- **Do not** use `fireEvent` for simulating user actions — `userEvent` models real browser behavior (hover, focus, pointer events) and catches interaction bugs that `fireEvent` misses.
- **Do not** assert on CSS classes or internal state. Assert on visible text, ARIA roles, and form values.
- **Do not** import `@testing-library/jest-dom` in individual test files — the matchers are already globally available after `vitest.setup.ts` runs.
- **Do not** skip `cleanup()` — jsdom does not automatically unmount trees between tests, and accumulated DOM state causes false positives.
- **Do not** call `server.listen()` inside a component test — it is already called in `vitest.setup.ts`. Calling it twice causes MSW to emit a warning and can produce double-handling bugs.

## References

- https://testing-library.com/docs/react-testing-library/intro
- https://testing-library.com/docs/user-event/intro
- https://github.com/testing-library/jest-dom
