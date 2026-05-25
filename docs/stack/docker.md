# Docker

## What & why

Both boilerplates ship production-ready multi-stage Dockerfiles that produce lean standalone images.
The multi-stage build (`base` / `deps` / `build` / `runner`) keeps the final image small by
discarding `node_modules` and build tooling — only the Next.js standalone output, static assets,
and the public folder are copied into the runner stage. `docker-compose.yml` covers the full local
stack for each boilerplate, with an important difference: A (`nextjs-fullstack`) requires a
Postgres database and a one-shot migration step; B (`nextjs-frontend`) is DB-free.

Base images: `node:22-alpine` (all stages), `postgres:17-alpine` (A only).

## Conventions / rules

**Shared Dockerfile structure (identical across A and B except where noted)**

```dockerfile
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV SKIP_ENV_VALIDATION=1
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

`corepack enable` activates pnpm without a separate install step. The `deps` stage copies
`pnpm-workspace.yaml` alongside `package.json` and the lockfile — this is required because
pnpm 11 reads `allowBuilds` from `pnpm-workspace.yaml` at install time (see `pnpm.md`). Without it,
`pnpm install --frozen-lockfile` fails with `ERR_PNPM_IGNORED_BUILDS`.

`SKIP_ENV_VALIDATION=1` prevents `@t3-oss/env-nextjs` from crashing the build stage when runtime
secrets (database URLs, auth keys) are absent.

**B only — `NEXT_PUBLIC_*` build ARG**

`NEXT_PUBLIC_*` variables are inlined at build time by Next.js, not at runtime. B's Dockerfile
therefore accepts a build argument:

```dockerfile
ARG NEXT_PUBLIC_API_URL=https://api.example.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_MOCKING=disabled
```

Pass the real URL when building for a specific environment:
```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.prod.example.com .
```

The dashboard route uses `force-dynamic` so Next.js does not attempt a static build-time data fetch
that would fail inside the container.

**`.dockerignore`**

Both boilerplates exclude `node_modules`, `.next`, `.git`, `coverage`, `playwright-report`,
`test-results`, `**/*.test.*`, `**/*.spec.*`, and `.env`.

A intentionally does **not** exclude `drizzle/` — the `migrate` compose service builds the `build`
target and needs the migration SQL files present in the image.

**A — `docker-compose.yml` (postgres + migrate + app)**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    # ...healthcheck, volumes
  migrate:
    build: { context: ., target: build }
    command: pnpm db:migrate
    depends_on: { postgres: { condition: service_healthy } }
  app:
    build: .
    depends_on:
      postgres: { condition: service_healthy }
      migrate: { condition: service_completed_successfully }
```

`migrate` builds the `build` target (which has drizzle-kit available) and runs `pnpm db:migrate`.
`app` starts only after both postgres is healthy and migrations have completed.

**B — `docker-compose.yml` (app only)**

```yaml
services:
  app:
    build:
      context: .
      args:
        NEXT_PUBLIC_API_URL: https://api.example.com
```

No services block, no database. `NEXT_PUBLIC_API_URL` is passed as a build arg so it is baked into
the static JS bundle.

## ✅ Best practices

- Always copy `pnpm-workspace.yaml` in the `deps` stage — forgetting it breaks `pnpm install`
  in pnpm 11.
- Use `--frozen-lockfile` in Docker (and CI) to guarantee reproducible installs.
- Pass `NEXT_PUBLIC_*` URLs as build args in B; never rely on runtime env for them.
- Use the healthcheck on the postgres service — it prevents `migrate` from starting before the
  database socket is open.
- Keep `SKIP_ENV_VALIDATION=1` in the `build` stage only; the `runner` stage should validate env
  at container start via the app's own startup logic.

## ❌ Worst practices / anti-patterns

- **Do not omit `pnpm-workspace.yaml`** from the `deps` COPY line — `ERR_PNPM_IGNORED_BUILDS`
  will crash the install.
- **Do not hardcode secrets** (`DATABASE_URL`, `BETTER_AUTH_SECRET`) in `docker-compose.yml` for
  anything beyond local development.
- Do not add `drizzle/` to `.dockerignore` in A — the migrate service needs those SQL files at
  build time.
- Do not run `pnpm db:migrate` as part of `CMD` in the `app` service — use the dedicated `migrate`
  service with `service_completed_successfully` ordering.
- Do not use `node:22` (Debian) instead of `node:22-alpine` — it produces much larger images.

## References

- https://nextjs.org/docs/app/building-your-application/deploying#docker-image (Next.js standalone)
- https://docs.docker.com/build/guide/multi-stage/ (multi-stage builds)
- https://docs.docker.com/compose/how-tos/startup-order/ (depends_on conditions)
- https://pnpm.io/cli/install#--frozen-lockfile (frozen lockfile)
