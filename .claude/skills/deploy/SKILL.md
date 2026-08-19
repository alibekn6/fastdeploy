---
name: deploy
description: Use when the user wants their site online or shared — "опубликуй", "выложи сайт", "publish", "deploy", "дай ссылку" — or wants an already-published site updated, or asks why the published site differs from the local one.
---

# Deploy (Vercel, sample-data mode)

Until the real backend exists, the site deploys in **sample-data mode** (`NEXT_PUBLIC_API_MOCKING=enabled`): it works fully in production — sign-in with any credentials, populated dashboards — on simulated data. This is verified to build and serve correctly. Tell the user plainly: «сайт пока работает на образцах данных — вход с любым паролем, данные общие и сбрасываются; когда подключим настоящую базу, всё станет реальным».

## Preflight

1. Full local gate first: `pnpm lint:ci && pnpm typecheck && pnpm build` (build with the same env you'll set on Vercel). Fix everything before deploying; the user hears one sentence, not the log.
2. Vercel CLI: `command -v vercel || pnpm add -g vercel`. Auth: `vercel whoami`; if not logged in, run `vercel login` and tell the user a browser window will open — they click "Confirm", nothing else.

## First deploy

```bash
vercel link --yes                       # creates/links the project non-interactively
# env vars are inlined at BUILD time — set them BEFORE deploying:
printf 'enabled'                    | vercel env add NEXT_PUBLIC_API_MOCKING production
printf 'https://api.example.com'    | vercel env add NEXT_PUBLIC_API_URL production
printf 'wss://api.example.com/ws'   | vercel env add NEXT_PUBLIC_WS_URL production
vercel --prod                           # capture the deployment URL from output
# second pass so SEO/canonical URLs are right:
printf 'https://<the-real-url>'     | vercel env add NEXT_PUBLIC_SITE_URL production
vercel --prod
```

Leave `NEXT_PUBLIC_POSTHOG_KEY` unset — analytics is a clean no-op without it.

## Verify (before telling the user it's live)

- `vercel inspect <url>` → state **READY**; `curl -s -o /dev/null -w "%{http_code}" <url>` → 200.
- Open `<url>` in the browser for the user; walk them through signing in (any email/password) so they see it working, then give them the link to share.
- On ERROR: `vercel logs <url>` — the most common failure is missing env vars (build dies on `Invalid environment variables` → the env block above wasn't applied).

## Updating a published site

`vercel --prod` again after the full gate. Same URL, new version.

## When the real backend arrives

```bash
vercel env rm NEXT_PUBLIC_API_MOCKING production -y
printf 'disabled'                 | vercel env add NEXT_PUBLIC_API_MOCKING production
vercel env rm NEXT_PUBLIC_API_URL production -y
printf 'https://<real-api-host>'  | vercel env add NEXT_PUBLIC_API_URL production
vercel --prod
```

The backend must satisfy `docs/frontend-template.md` → "Backend assumptions" (JWT signature checks, httpOnly cookies, rate limits) and serve the endpoints logged in `docs/api-contract.md`. Cookies must land on the app's origin or a shared registrable domain, or auth will not work.

## Don'ts

- Don't deploy with mocking disabled while the backend doesn't exist — every page's data fetch will fail.
- Don't skip the two-pass `NEXT_PUBLIC_SITE_URL` step — otherwise canonical/sitemap URLs point at localhost.
- Don't hand the user a URL you haven't seen return 200.
