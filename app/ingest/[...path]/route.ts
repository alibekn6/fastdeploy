import { analyticsConfigured } from "@/shared/analytics/consent";
import { proxyToAnalytics } from "@/shared/analytics/ingest-proxy";
import { env } from "@/shared/config/env";

// Every event is unique — never cache, never prerender.
export const dynamic = "force-dynamic";

/**
 * Same-origin reverse proxy for PostHog (`api_host: "/ingest"`), replacing the
 * `rewrites()` that could take the server down when the analytics host was
 * unreachable — see `src/shared/analytics/ingest-proxy.ts`.
 *
 * The upstream is resolved through `analyticsConfigured()` so the optional-
 * analytics contract holds end to end: with `NEXT_PUBLIC_POSTHOG_KEY` unset
 * there is nothing to ingest, so the route is inert (503) and never opens a
 * connection — previously the rewrite proxied regardless of the key.
 */
const upstream = () => (analyticsConfigured() ? env.NEXT_PUBLIC_POSTHOG_HOST : undefined);

async function handle(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  return proxyToAnalytics(request, path, upstream());
}

export { handle as GET, handle as POST, handle as OPTIONS };
