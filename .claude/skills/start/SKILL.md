---
name: start
description: Use when a session opens with a non-technical user, when someone asks how to begin ("с чего начать", "как запустить", "how do I start"), when the app has never run on this machine (missing node_modules or .env), or when any command fails with "Invalid environment variables".
---

# First run (builder onboarding)

Goal: from "hi" to the user seeing their working site in a browser, in one session, with zero jargon. The user is a non-technical builder — see the plain-language contract in CLAUDE.md ("Builder mode").

## Steps

1. **Reply in the user's language** (ru/kk/en — whatever they wrote in).
2. **Tools check**: `node --version` (need 22+, see `.nvmrc`), `pnpm --version` (need 11+), `git --version`. Assume nothing is installed — builders start from a clean Mac. Install anything missing yourself via Homebrew: `brew install node pnpm git` (only the missing ones). If `brew` itself is missing: you cannot install it (the installer asks for the Mac password), so ask the user to paste this one line into the chat with a `!` in front — `! /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` — and explain that the Mac will ask for their password and typing it is invisible (that's normal). Afterwards, wire brew into the shell yourself: `echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile` and use `/opt/homebrew/bin/brew` for the current session. No brew and no admin rights → fallback: `corepack enable` or `npm i -g pnpm` (needs Node). Tell the user one sentence — "настраиваю инструменты" — not version numbers. The human-facing version of this setup lives in `START_HERE.md`; point people there only if they ask for written instructions for another computer.
3. **Install**: if `node_modules/` is missing, run `pnpm install` (background; takes minutes — warn the user it's a one-time wait).
4. **Create `.env` (REQUIRED before any run/build)**: if `.env` is missing, copy `.env.example`. Without `.env`, every `dev`/`build` command fails at startup with `❌ Invalid environment variables` — that error means "create .env", nothing else. Then pick the mode:
   - **Real mode (the standard)** — when Docker is available: `pnpm db:local` (starts Postgres), set `DATABASE_URL=postgresql://fastdeploy:fastdeploy@localhost:5433/fastdeploy`, `JWT_SECRET=$(openssl rand -base64 48)`, `NEXT_PUBLIC_API_MOCKING=disabled`, and `NEXT_PUBLIC_API_URL=http://localhost:3000/api`; then `pnpm db:push && pnpm db:seed`. Real sign-up, real passwords, data persists.
   - **Sample mode (fallback)** — no Docker/DB on this machine: `NEXT_PUBLIC_API_MOCKING=enabled`. Tell the user plainly: «пока это песочница — вход с любым паролем, данные не сохраняются; при публикации будет настоящая база и настоящий вход».
5. **Run**: real mode → `pnpm dev` **with the port matching `NEXT_PUBLIC_API_URL`** (if 3000 is busy, do NOT accept the auto-shifted port — restart as `pnpm dev -p <free-port>` and set the same port in `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_SITE_URL`). Sample mode → `pnpm dev:mock`; read the actual URL from the log. Never tell the user a URL you haven't seen in the output.
6. **Show**: `open <actual-url>`. Explain what they see: a working demo site with sample data; signing in works with **any** email and password (that's the sample mode, it's intentional).
7. **Invite**: ask what they want to build, in their own words — then follow the `build` skill.

## Quick fixes

| Symptom | Cause → fix |
| --- | --- |
| `❌ Invalid environment variables` | No `.env` → step 4 |
| Page shows another app / wrong site | You opened port 3000 but Next moved to 3001 → re-read the log |
| `ERR_PNPM_IGNORED_BUILDS` | Don't touch — `pnpm-workspace.yaml` already allows `sharp`; run `pnpm install` again |
| `command not found: pnpm` (or `node`, `git`) | `brew install <tool>`; no brew → step 2's Homebrew route; last resort for pnpm: `corepack enable` / `npm i -g pnpm` |
| `command not found: brew` right after installing it | brew isn't on PATH yet → `echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile`, then call `/opt/homebrew/bin/brew` directly |
| API responses are 500 `server_misconfigured` | Real mode without `DATABASE_URL`/`JWT_SECRET` in `.env` → fill them (step 4) or fall back to sample mode |
| Sign-in works with ANY password | That's sample mode, by design — switch to real mode (step 4) for real auth |

## Don'ts

- Don't show the user raw terminal output or error dumps — read it yourself, fix, then say one human sentence about what happened.
- Don't start explaining the stack, folders, or "how the template works" unless the user asks.
- Don't run `pnpm dev` (real mode) without `DATABASE_URL` + `JWT_SECRET` set — use `dev:mock` for the sandbox fallback instead.
- Don't leave the user thinking the sandbox is the real thing: any-password sign-in must always be named as «песочница/образцы данных».
