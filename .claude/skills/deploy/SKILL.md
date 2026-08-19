---
name: deploy
description: Use when the user wants their site online or shared — "опубликуй", "выложи сайт", "publish", "deploy", "дай ссылку" — or wants an already-published site updated, or asks why the published site differs from the local one.
---

# Deploy (Vercel)

Two modes; pick by what exists:

| Mode | When | Result |
| --- | --- | --- |
| **Real data** (preferred) | Neon DB provisioned (or user agrees to provision now) | Live platform: real sign-ups, data persists |
| **Sample data** | No DB yet, or user just wants a quick demo | Fully working site on simulated data |

Tell the user plainly which mode they're getting. Sample mode: «вход с любым паролем, данные общие и сбрасываются». Real mode: «настоящая регистрация и база — данные сохраняются».

## Preflight (both modes)

1. Full local gate: `pnpm lint:ci && pnpm typecheck && pnpm test && pnpm build`. Fix everything first; the user hears one sentence, not the log.
2. CLI: `command -v vercel || pnpm add -g vercel`; `vercel whoami`, else `vercel login` (tell the user a browser window opens — click Confirm). `vercel link --yes` if `.vercel/` is missing.

## Real-data deploy

```bash
vercel integration add neon --no-claim   # one-time; if it prints userActionRequired,
                                         # open the verification_uri for the user to
                                         # accept Neon's terms in the browser, then retry
vercel env pull .env.local               # brings DATABASE_URL locally
pnpm db:push && pnpm db:seed             # tables + demo content
# JWT secret (server-only, NOT NEXT_PUBLIC):
openssl rand -base64 48 | tr -d '\n' | vercel env add JWT_SECRET production

vercel --prod                            # first deploy → capture the production URL
# NEXT_PUBLIC_* are inlined at BUILD time — set them, then deploy again:
printf 'disabled'                   | vercel env add NEXT_PUBLIC_API_MOCKING production
printf 'https://<the-url>/api'      | vercel env add NEXT_PUBLIC_API_URL production
printf 'https://<the-url>'          | vercel env add NEXT_PUBLIC_SITE_URL production
printf 'wss://api.example.com/ws'   | vercel env add NEXT_PUBLIC_WS_URL production
vercel --prod
```

Cookies are same-origin (`/api` lives in the app), so auth works on the bare
`*.vercel.app` URL — no custom domain needed. Leave `NEXT_PUBLIC_POSTHOG_KEY` unset
(clean no-op). Details: `docs/backend.md`.

## Sample-data deploy

Same as real-data but skip the neon/db/JWT block and set
`NEXT_PUBLIC_API_MOCKING=enabled` and `NEXT_PUBLIC_API_URL=https://api.example.com`.
Verified to build and serve. Upgrade later by running the real-data block and
redeploying.

## Verify (before telling the user it's live)

- `vercel inspect <url>` → READY; `curl -s -o /dev/null -w "%{http_code}" <url>` → 200.
- Real mode: `curl -s <url>/api/posts` returns the seeded posts; register a throwaway
  account through the site to prove the full loop.
- Open the URL in the browser for the user and walk them through signing in
  (real mode: demo account from `pnpm db:seed`, or their fresh registration).
- On ERROR: `vercel logs <url>` — commonest causes: missing env vars (build dies on
  `Invalid environment variables`) or a skipped second `vercel --prod` after env changes.

## Updating a published site

`vercel --prod` after the full gate. If the schema changed: `pnpm db:push` first.

## Don'ts

- Don't set `NEXT_PUBLIC_API_MOCKING=disabled` without DATABASE_URL + JWT_SECRET in
  Vercel env — every data fetch 500s (`server_misconfigured`).
- Don't put JWT_SECRET into anything `NEXT_PUBLIC_*`, logs, or chat output.
- Don't skip the second `--prod` pass after adding `NEXT_PUBLIC_*` vars.
- Don't hand the user a URL you haven't seen return 200.
