import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;

const nextConfig: NextConfig = {
  output: "standalone",
  skipTrailingSlashRedirect: true,
  async rewrites() {
    if (!POSTHOG_HOST) return [];
    return [
      { source: "/ingest/static/:path*", destination: `${POSTHOG_HOST}/static/:path*` },
      { source: "/ingest/:path*", destination: `${POSTHOG_HOST}/:path*` },
    ];
  },
};

export default withNextIntl(nextConfig);
