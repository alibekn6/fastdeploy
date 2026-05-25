# Commitizen + Commitlint

## What & why

Conventional Commits is enforced at two levels. **Commitizen** provides an interactive CLI prompt
(`pnpm cz`) that guides you through building a valid commit message without memorising the format.
**Commitlint** validates the message that was written — whether via `pnpm cz`, a GUI, or plain
`git commit` — and rejects it if it does not conform to the Conventional Commits spec. Together
they make the commit log machine-readable, which enables automated changelogs and semantic
versioning down the road.

Pinned versions: `commitizen@4.3.1`, `cz-conventional-changelog@3.3.0`,
`@commitlint/cli@21.0.1`, `@commitlint/config-conventional@21.0.1`.

Both boilerplates (A: `nextjs-fullstack`, B: `nextjs-frontend`) are identical for this tooling.

## Conventions / rules

**Commitizen — `package.json`**

```json
"config": {
  "commitizen": {
    "path": "./node_modules/cz-conventional-changelog"
  }
}
```

`path` points at a local `node_modules` path so the prompt works without a global install.

Run a guided commit:
```bash
pnpm cz
```

This launches the interactive prompt: type → scope → short description → body → breaking change →
issue refs. The resulting message is fed to Git and then validated by the `commit-msg` hook.

**Commitlint — `commitlint.config.cjs`**

```js
/** @type {import('@commitlint/types').UserConfig} */
module.exports = { extends: ["@commitlint/config-conventional"] };
```

No custom rules are added. The full `@commitlint/config-conventional` ruleset applies, which
includes:

- `type-enum` — allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `chore`, `revert`.
- `subject-case` — the subject must be **lowercase**. A commit like `feat: Add dashboard` is
  rejected; `feat: add dashboard` is accepted.
- `subject-empty` — subject must not be blank.
- `type-empty` — type must not be blank.

**The `commit-msg` hook — `.husky/commit-msg`**

```sh
pnpm commitlint --edit "$1"
```

Runs on every `git commit` and `git merge` (Git passes the message file path in `$1`). The hook is
installed automatically via `prepare: husky`.

**Commit format**

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

Examples:
```
feat(auth): add email/password login
fix(dashboard): correct pagination offset
chore: upgrade drizzle-orm to 0.46
```

## ✅ Best practices

- Use `pnpm cz` for interactive guidance when you are unsure of the correct type or scope.
- Keep subjects lowercase and imperative mood (`add`, `fix`, `remove` — not `added`, `fixed`).
- Add a `!` after the type/scope for breaking changes: `feat(api)!: remove legacy endpoint`.
- Reference issues in the footer: `Closes #42`.
- `commitlint.config.cjs` uses `.cjs` extension because the repo's `package.json` does not set
  `"type": "module"`, but the file must be CommonJS (`module.exports`).

## ❌ Worst practices / anti-patterns

- **Do not start the subject with a capital letter** — `subject-case` will reject it at the
  `commit-msg` hook.
- Do not use free-form types (`update`, `misc`, `wip`) — they are not in the allowed `type-enum`
  and the hook will reject the commit.
- Do not bypass the hook with `git commit --no-verify` just to avoid fixing a bad message — the
  message lands in history permanently.
- Do not add custom rules to `commitlint.config.cjs` without syncing the change through
  `tooling/shared/` — the file is managed by the tooling sync mechanism.

## References

- https://commitizen-tools.github.io/commitizen/ (Commitizen docs)
- https://github.com/conventional-changelog/cz-conventional-changelog (adapter docs)
- https://commitlint.js.org/ (Commitlint docs)
- https://www.conventionalcommits.org/ (Conventional Commits spec)
