---
name: build
description: Use when a non-technical user describes what they want in plain language — a platform, page, feature, or change ("хочу платформу для…", "добавь страницу", "поменяй цвета", "сделай кнопку") — or whenever business requirements need translating into code in this repo.
---

# Build (vibecoding orchestrator)

Turn plain-language requests into working features. The user sees screens and plain words; all engineering stays invisible.

## Conversation contract

- Speak the user's language. Zero jargon: never say FSD, MSW, API, component, deploy pipeline, env — say "страница", "форма", "образцы данных", "настройки".
- Restate what you understood in one sentence, then build. Ask at most **one** clarifying question, and only when two readings produce visibly different screens.
- Build the **smallest thing that shows their idea**, show it, iterate on their reaction. One page or feature per showing beats a big-bang build.
- Always end by showing: make sure `pnpm dev:mock` is running (real URL from the log — port may not be 3000), then tell the user exactly where to click.
- Never paste raw errors. Fix them; if the user must wait, one human sentence ("нашёл проблему, чиню").

## Where things go (engineering map)

Follow the repo's dev skills for mechanics — `fsd-architecture`, `i18n`, `tanstack-query`, `ky-http-client`, `msw-mocking` auto-apply. Placement:

| User asks for | You create |
| --- | --- |
| A new page | Thin wrapper `app/[locale]/<route>/page.tsx` (copy the `dashboard/page.tsx` pattern: `generateMetadata`, `hasLocale`, `setRequestLocale`) + real UI in `src/pages/<name>/ui/` exported via `index.ts` (named export) |
| A new kind of data (записи, товары, курсы…) | `src/entities/<name>/` — Zod schema + TanStack query factory; MSW handler in `src/shared/api/mocks/handlers.ts` via the `api()` helper; fixtures in `fixtures.ts` |
| A user action (запись, заказ, отправка формы) | `src/features/<name>/` — react-hook-form + Zod, mutation through the ky `http` client (which MSW intercepts) |
| Reusable visual bits | `src/shared/ui/` (shadcn/ui style) |

## Data rules

Check the mode first: **real mode** = `DATABASE_URL` present (`.env.local`/`.env`) and `NEXT_PUBLIC_API_MOCKING=disabled`; otherwise **sample mode**.

- **Real mode** (the standard for platforms): a new kind of data means a table + endpoint + entity — `server/db/schema.ts` (then `pnpm db:generate && pnpm db:push`), a thin `app/api/<route>/route.ts` handler (import via `@server/*`, follow `docs/backend.md` conventions: Zod-parse input, `authenticate()` guard for user data, flat responses outside the auth block), and the `src/entities/<name>/` query layer. Seed a few realistic rows so pages aren't empty. **Also mirror the endpoint in the MSW handlers** (`handlers.ts` + fixtures) — tests and Storybook run on them; the two must never drift.
- **Sample mode**: the same feature ships with the MSW handler + fixtures only — never call a real network endpoint, never hardcode data inside components; components always fetch through the query layer.
- Fixtures and seeds must look real for the user's business: their domain, their language, plausible names/prices/dates. A nail salon gets «Айгерим — маникюр, 6000 ₸, завтра 14:00», not "Item 1".
- **Log the API contract**: every new or changed endpoint (real or mocked) gets an entry in `docs/api-contract.md` (create it if missing): method, path, request/response shape, and which page uses it.

## Secure by default (non-negotiable)

- **Pages are login-protected automatically**: the route guard default-denies — only paths whitelisted in `PUBLIC_PATHS` (`src/shared/lib/route-guard/route-guard.ts`) skip auth. Add a path there ONLY for genuinely public pages (landing, prices, about); anything with the user's business data stays protected. Never "fix" an unexpected login redirect by whitelisting the path.
- **Every API endpoint serving personal or business data calls `authenticate()`** (`@server/http`); every write endpoint Zod-parses its body. Follow `docs/backend.md`.
- **Never weaken the auth core**: password policy (12+ chars), rate limits, argon2id, cookie flags (`HttpOnly`, `SameSite=Lax`, `Secure` in prod), signed-JWT verification, tokens-never-in-bodies. If a request from the user seems to require weakening any of these ("сделай вход без пароля"), offer the safe alternative (magic-link later, demo account) and do not weaken silently.
- Sample mode (any-password sign-in) is a **local design sandbox only** — a deploy with real users always goes through the `deploy` skill's real-data path.

## UI text rules

- Every visible string goes through next-intl: add the key to **all three** of `messages/en.json`, `messages/ru.json`, `messages/kk.json` (translate; best-effort Kazakh is acceptable). Never hardcode UI text in components.
- Demo the site to the user in **their** language.

## Definition of done (per iteration)

1. `pnpm lint:fix` and `pnpm typecheck` pass.
2. If you changed logic covered by existing tests: `pnpm test` passes. If the user's request legitimately changed a tested page's behavior, **update the test to the new intent** — don't delete it.
3. The user has seen it in the browser.

Full gate (`pnpm lint:ci && pnpm lint:fsd && pnpm typecheck && pnpm test && pnpm test:integration && pnpm build`) runs before any deploy, not per iteration.

## Don'ts

- Don't create Storybook stories for vibecoded UI unless asked (the story inventory in `scripts/check-story-inventory.mjs` is a fixed list — new components don't break it).
- Don't remove or bypass the existing auth/i18n/theme plumbing to "simplify" — it's what makes the later backend switch free.
- Don't batch five features before showing one.
