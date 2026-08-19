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
4. **Create `.env` (REQUIRED before any run/build)**: if `.env` is missing, copy `.env.example` and set `NEXT_PUBLIC_API_MOCKING=enabled`. Without `.env`, every `dev`/`build` command fails at startup with `❌ Invalid environment variables` — that error means "create .env", nothing else. Keep mocking `enabled` until a real backend exists.
5. **Run**: start `pnpm dev:mock` in the background, wait for `✓ Ready`, and **read the actual URL from the log** — when port 3000 is busy, Next silently moves to 3001. Never tell the user a URL you haven't seen in the output.
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

## Don'ts

- Don't show the user raw terminal output or error dumps — read it yourself, fix, then say one human sentence about what happened.
- Don't start explaining the stack, folders, or "how the template works" unless the user asks.
- Don't run plain `pnpm dev` for builders — always `dev:mock` (there is no real API to talk to).
