# Start here 👋

> 🇷🇺 Claude понимает русский — просто пишите ему по-русски.
> 🇰🇿 Claude қазақша түсінеді — оған қазақша жаза беріңіз.

This folder is a **ready-made foundation for your own web platform**. You don't need to
know programming — Claude (an AI assistant) writes all the code. You describe what you
want in plain words; Claude builds it and shows it to you in your browser.

## What you need

1. **Claude Code** installed — get it at <https://claude.com/claude-code>
   (if a developer set up this computer for you, it's probably already installed).
2. About 10 minutes for the first setup.

## How to begin

1. Open the **Terminal** app in this folder
   (on a Mac: right-click this folder → *Services* → *New Terminal at Folder*).
2. Type `claude` and press **Enter**.
3. Say hello and describe what you want to build, in your own words. For example:

   > "I run a nail salon. I want a site where clients book appointments with my masters."

   > "Мне нужна платформа, где студенты покупают курсы и смотрят уроки."

Claude will set everything up, open your site in the browser, and start building.
From then on, just keep talking:

| You say | What happens |
| --- | --- |
| "Show me my site" | Your site opens in the browser |
| "Add a page with prices" | Claude builds it and shows you |
| "Make the buttons bigger" / "I don't like the colors" | Claude changes it |
| "Publish my site" / "Deploy" | Your site goes live on the internet |

## Good to know

- **Your site runs on sample data for now.** Bookings, sign-ins and lists are simulated
  so you can design and test everything. When your real backend (database) is connected
  later, one setting switches it to real data — nothing you built is lost.
- **You can't break anything.** Everything is saved with version history, and Claude can
  undo any change. Experiment freely.
- **If something looks wrong or scary** (red text, error messages) — don't worry, just
  copy it to Claude and say "fix this".

---

*Developers: see [README.md](README.md) and [CLAUDE.md](CLAUDE.md) — this is a Next.js 16 +
FSD boilerplate with a guided builder-mode skill layer in `.claude/skills/`.*
