# fastdeploy

**RU:** Опишите платформу обычными словами — получите работающий сайт в интернете.
**EN:** Describe your platform in plain words — get a working site live on the internet.

---

## 🇷🇺 Что это

Это стартовый набор для «вайбкодинга»: человек **без навыков программирования** открывает
эту папку в [Claude Code](https://claude.com/claude-code), пишет по-человечески, что ему
нужно — и получает настоящую платформу, а не набор HTML-страниц.

### Как это работает

| Шаг | Вы пишете | Что происходит |
| --- | --- | --- |
| 1 | «Хочу платформу, где клиенты записываются к мастерам» | Claude строит страницы, формы и логику внутри готового каркаса |
| 2 | «Покажи» | Сайт открывается в браузере — всё живое: вход, списки, записи |
| 3 | «Поменяй цвета, добавь страницу с ценами» | Claude меняет и показывает снова |
| 4 | «Опубликуй» | Сайт уезжает на Vercel — реальная ссылка, можно слать клиентам |

Нетехнарям больше ничего знать не нужно — начните с **[START_HERE.md](START_HERE.md)**.

### Почему это работает без бэкенда

Главный трюк — **образцовые данные (MSW)**. Бэкенда ещё нет, но платформа ведёт себя как
настоящая: вход по любому паролю, дашборды и списки наполнены данными. Так можно
спроектировать и показать заказчику весь продукт **до** того, как написана серверная часть.

Когда бэкенд с базой данных будет готов, переключение на реальные данные — это **одна
переменная окружения** (`NEXT_PUBLIC_API_MOCKING=disabled` + адрес API). Ничего из
построенного не переделывается. Бонус: все моки, которые Claude создал для фронта,
документируют API-контракт — команда бэкенда точно знает, какие ручки писать
(требования к бэкенду уже описаны в [docs/frontend-template.md](docs/frontend-template.md)).

### Что уже внутри каркаса

Страницы и роутинг · формы с валидацией · авторизация (по httpOnly-cookie, готова под
реальный бэкенд) · три языка (ru / kk / en) · тёмная тема · SEO (sitemap, robots, OG) ·
аналитика (PostHog, опционально) · тесты и линтеры — всем этим управляет Claude,
пользователю это не показывается.

---

## 🇬🇧 What is this

A vibecoding starter kit: a person **with zero programming skills** opens this folder in
[Claude Code](https://claude.com/claude-code), describes what they need in plain language,
and gets a real platform — pages, forms, auth, multi-language, dark theme, SEO — not a pile
of HTML files. Non-technical builders start at **[START_HERE.md](START_HERE.md)**.

The trick: until the backend exists, the platform runs on **realistic sample data (MSW)** —
sign-in, dashboards and lists all work, so the whole product can be designed, demoed and
deployed first. When the real backend lands, switching to live data is a single environment
variable, and the mock handlers double as the documented API contract for the backend team.

---

## The skill layer

The guided experience lives in `.claude/skills/` and ships with the repo:

| Skill | Trigger | What it does |
| --- | --- | --- |
| `/start` | first session, "с чего начать" | installs everything, creates `.env`, opens the site in the browser |
| `/build` | "хочу платформу…", "добавь страницу…" | plain-language feature building on top of the template's conventions |
| `/deploy` | "опубликуй", "publish my site" | deploys to Vercel with the right env vars (mock mode until the backend exists) |

Users never need to know these names — `CLAUDE.md` routes plain-language requests to the
right skill automatically. Slash commands are just shortcuts.

## For developers

```bash
pnpm install
cp .env.example .env   # then set NEXT_PUBLIC_API_MOCKING=enabled for mock mode
pnpm dev:mock          # → http://localhost:3000 (sign in with any credentials)
```

| Task | Command |
| --- | --- |
| Dev (mocked / plain) | `pnpm dev:mock` · `pnpm dev` |
| Lint / types | `pnpm lint` · `pnpm typecheck` |
| Tests (unit / integration / e2e) | `pnpm test` · `pnpm test:integration` · `pnpm e2e` |
| Storybook | `pnpm storybook` |
| Production build | `pnpm build` |

Stack: Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 + shadcn/ui ·
Feature-Sliced Design (Steiger-enforced) · TanStack Query · MSW · next-intl · Vitest + Playwright.

Deep documentation:

- **[docs/frontend-template.md](docs/frontend-template.md)** — full template internals:
  auth/cookie flow, mock-mode limits, security tradeoffs, and **backend assumptions** (read
  this before writing the backend)
- **[docs/stack/](docs/stack/)** — per-tool rules and best practices
- **[CLAUDE.md](CLAUDE.md)** — agent guidance (conventions, gotchas, review subagents)

## Roadmap

- [x] Frontend template + builder skill layer + Vercel deploy (this repo)
- [ ] Backend + database (next phase) — the frontend already consumes an external HTTP API,
      so the backend plugs in via env vars with no frontend rework
