# Backend (in-app, Next.js route handlers)

Phase-2 backend living inside this app: `server/` (db, auth, helpers) + `app/api/*`
(route handlers). It implements the exact HTTP contract the frontend already consumes
(see `docs/frontend-template.md` → Authentication / Backend assumptions), so switching
from MSW sample data to real data is env-only — no frontend changes.

## Enable real mode

```bash
vercel integration add neon        # provision Neon Postgres (one-time, browser terms)
vercel env pull .env.local         # brings DATABASE_URL locally
# add to .env / Vercel env:
#   JWT_SECRET=$(openssl rand -base64 48)
#   NEXT_PUBLIC_API_MOCKING=disabled
#   NEXT_PUBLIC_API_URL=http://localhost:3000/api   (prod: https://<domain>/api)
pnpm db:push                       # create tables (drizzle-kit)
pnpm db:seed                       # demo user + fixture posts/comments
pnpm dev                           # real data end-to-end
```

`proxy.ts` already excludes `/api` from the i18n/auth middleware; cookies are
same-origin by construction, so auth works on any `*.vercel.app` URL without a
custom domain.

## Endpoints (the mock contract, implemented)

| Route | Notes |
| --- | --- |
| `POST /api/auth/register` | Zod-validated; server-side 12-char password minimum; 409 `email_taken` (documented enumeration tradeoff); sets both cookies |
| `POST /api/auth/login` | argon2id verify with timing equalization on unknown email; per-email + per-IP sliding-window rate limit (429 `too_many_attempts`); sets both cookies |
| `POST /api/auth/refresh` | Full JWT verification + DB ledger check (revocation, expiry, user liveness); mints a new access token only — **no rotation** |
| `POST /api/auth/logout` | Break-glass: always 200, clears both cookies, best-effort ledger revocation |
| `GET /api/auth/me` | Signature-verified access token → user from DB |
| `GET /api/users/:id` | Flat body; requires auth (email is PII) |
| `GET /api/posts`, `/api/posts/:id`, `/api/posts/:id/comments` | Flat bodies, bare-status errors; comments served `at` DESC |

Auth block responses use the `{data}` / `{error:{code,message}}` envelope; the rest are
flat — exactly like the MSW handlers.

## Security posture (contract + OWASP)

- **JWT HS256 via `jose`**, algorithm pinned, signature + expiry verified on every
  authenticated request (`server/auth/jwt.ts`). The middleware's unverified decode
  remains routing UX only. `alg:none` tokens are rejected (unit-tested).
- **Cookies**: `HttpOnly; SameSite=Lax; Path=/`, `Secure` in production. Tokens never
  appear in response bodies. `SameSite=Lax` is the CSRF stance — state changes stay
  non-GET.
- **Passwords**: argon2id (OWASP params m=19456 KiB, t=2, p=1), 12-char server-side
  minimum. Login burns a reference hash when the email is unknown so timing can't
  enumerate accounts.
- **Rate limiting**: DB-backed sliding window — login 10/15 min per email and per IP,
  register 20/h per IP. Swap to Upstash Redis if volume demands.
- **Refresh tokens**: JWT with `jti`; ledger row per token (`refresh_tokens`) enables
  server-side revocation; logout revokes; expiry double-checked in DB.
- **Validation**: every body Zod-parsed; unified 500 mapping never leaks stacks;
  `server_misconfigured` code when DATABASE_URL/JWT_SECRET are absent.

## Layout & conventions

- `server/` is plain server code (outside FSD; Steiger doesn't lint it): `config.ts`
  (env assertions), `db/` (Drizzle schema, lazy client, migrations, seed), `auth/`
  (jwt, password, cookies, rate-limit), `http.ts` (envelope/error/authenticate).
- `app/api/**/route.ts` stays thin: parse → guard → db → respond; import via
  `@server/*`.
- Schema changes: edit `server/db/schema.ts` → `pnpm db:generate` (SQL migration into
  `server/db/migrations/`) → `pnpm db:push`.
- New data endpoints follow the same split and get logged in `docs/api-contract.md`
  when they're born from vibecoding.
