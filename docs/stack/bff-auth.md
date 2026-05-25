# BFF Auth (thin cookie-based auth layer)

## What & why

This repo uses a minimal Backend-for-Frontend (BFF) pattern for authentication. The Next.js app exposes three same-origin Route Handlers (`/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`) that proxy auth calls to the external API and manage an **httpOnly cookie** on behalf of the browser. The browser never sees the session token — it is stored server-side only, invisible to JavaScript.

This is a placeholder design: the BFF is intentionally thin and isolated behind a single swap point so it can be replaced with Better Auth (or any other auth library) without touching entity code, queries, or UI components.

## Conventions / rules

### Cookie configuration — `src/shared/config/auth.ts`

```ts
// SWAP POINT: replace this BFF with Better Auth client when the real backend runs it.
export const SESSION_COOKIE = "session";
```

The cookie name is the only auth constant exported from shared config. Cookie options used in the BFF:

```ts
{ httpOnly: true, sameSite: "lax", secure: true, path: "/" }
```

`secure: true` means the cookie is only sent over HTTPS. For local development this is fine when using `localhost` (browsers exempt localhost from the secure requirement), but it can cause issues in some e2e setups on plain HTTP. If local e2e tests fail due to cookie rejection, verify your test runner is hitting `https://localhost` or temporarily set `secure: false` for the test environment.

### BFF logic — `src/app/api-routes/auth.ts`

The three functions contain all auth logic:

- `login(request)` — POSTs credentials to the external API (`http.post("auth/login", ...)`), receives a token, sets the httpOnly cookie via `cookies()` from `next/headers`.
- `logout()` — deletes the cookie.
- `refresh()` — reads the current token from the cookie, POSTs to `auth/refresh`, rotates the cookie with the new token.

### Route handlers — `app/api/auth/*/route.ts`

Each route is a one-liner re-export:

```ts
// app/api/auth/login/route.ts
import { login } from "@/app/api-routes/auth";
export const POST = login;
```

The logic lives in `src/app/api-routes/auth.ts` (testable without the Next.js routing layer); the `app/api/` files are pure wiring.

### Sign-in feature — `src/features/auth/api/sign-in.ts`

Client code calls the **same-origin BFF**, not the external API directly:

```ts
const res = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(parsed),
});
```

Do not substitute `http.post("auth/login", ...)` here — `http` points to the external API origin; using it from the browser would expose credentials to a cross-origin endpoint and bypass the httpOnly cookie mechanism.

### Logout from the header — `src/widgets/header/ui/header.tsx`

```ts
await fetch("/api/auth/logout", { method: "POST" });
router.push(routes.login);
```

Same pattern: plain `fetch` to the same-origin BFF route.

### Route protection — `middleware.ts`

```ts
export function middleware(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE))
    return NextResponse.redirect(new URL(routes.login, request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/dashboard/:path*"] };
```

Middleware checks for cookie presence. It does not validate the token (no crypto in the Edge runtime). This is sufficient as a UX guard; real authorization happens when the external API rejects expired tokens.

### Integration tests — `src/app/api-routes/auth.integration.test.ts`

Tests mock `next/headers` with a `Map`-backed cookie store and intercept the external API call with MSW:

```ts
vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: (n, v) => store.set(n, v),
    get: (n) => store.has(n) ? { value: store.get(n) } : undefined,
    delete: (n) => store.delete(n),
  }),
}));
```

This keeps tests fast and self-contained without a real network or Next.js server.

## ✅ Best practices

- Call auth endpoints only through the BFF (`/api/auth/*`) from client code — never call the external `http` client for auth from the browser.
- Keep `SESSION_COOKIE` imported from `src/shared/config/auth.ts` everywhere (middleware, BFF, tests) so there is a single source of truth for the cookie name.
- Test the BFF logic via `src/app/api-routes/auth.ts` directly (unit/integration), not through the HTTP route layer.
- When adding new protected routes, extend the `matcher` array in `middleware.ts`.

## ❌ Worst practices / anti-patterns

- **Do not** call `http.post("auth/login", ...)` from a Client Component or the sign-in feature — tokens must be handled server-side only.
- **Do not** store the session token in `localStorage`, `sessionStorage`, or a non-httpOnly cookie — this exposes it to XSS.
- **Do not** put auth business logic in `app/api/auth/*/route.ts` files — keep them as thin re-exports; all logic belongs in `src/app/api-routes/auth.ts`.
- **Do not** validate the JWT in middleware for authorization decisions — Edge runtime has limited crypto support; let the external API enforce authorization.

## Swap point: replacing with Better Auth

This entire BFF is designed to be swapped out in one operation:

1. Replace `src/shared/config/auth.ts` — swap `SESSION_COOKIE` constant for the Better Auth client config/export.
2. Replace `src/app/api-routes/auth.ts` — replace `login`/`logout`/`refresh` with Better Auth handler adapters.
3. Update `src/features/auth/api/sign-in.ts` — call the Better Auth client method instead of `fetch("/api/auth/login")`.
4. Update `app/api/auth/*/route.ts` — re-export Better Auth route handlers.

Everything else (middleware cookie check, header logout button, entity queries, `http` client) is unaffected.

## References

- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Next.js `cookies()` API: https://nextjs.org/docs/app/api-reference/functions/cookies
- Next.js Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- Better Auth (future swap target): https://better-auth.com
