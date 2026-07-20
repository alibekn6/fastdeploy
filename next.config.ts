import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // PostHog's endpoints are trailing-slash-sensitive; keep Next from rewriting
  // `/ingest/e/` to `/ingest/e` before the route handler sees it.
  skipTrailingSlashRedirect: true,
  // NOTE: `/ingest/**` is deliberately NOT a `rewrites()` entry. Next's rewrite
  // proxy has no timeout and no error boundary, so an unreachable analytics
  // host threw out of the request pipeline on every captured event and could
  // take the whole server process down (libuv assert). It is a route handler
  // instead — `app/ingest/[...path]/route.ts`.
};

export default withNextIntl(nextConfig);
