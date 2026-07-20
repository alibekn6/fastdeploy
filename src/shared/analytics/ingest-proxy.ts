/**
 * Same-origin `/ingest` reverse proxy to the self-hosted PostHog instance.
 *
 * This used to be a pair of `rewrites()` in `next.config.ts`. Next's rewrite
 * proxy has NO error boundary and NO timeout: when the analytics host is
 * unreachable (a stale `NEXT_PUBLIC_POSTHOG_HOST`, a down instance, a DNS
 * blip), every event threw `ECONNREFUSED` out of the request pipeline, dumped a
 * full undici stack to stderr, and under sustained autocapture traffic took the
 * whole `next-server` process down with a libuv assertion. Analytics is
 * OPTIONAL by contract — a dead analytics endpoint must never be able to affect
 * app availability.
 *
 * So the proxy is an explicit route handler instead: bounded by a timeout,
 * wrapped in a catch, and degraded to a 5xx that PostHog's client treats as a
 * retryable delivery failure. The event is lost; the app stays up.
 */

/** Analytics is best-effort — a slow host must not pin a server request open. */
const UPSTREAM_TIMEOUT_MS = 5_000;

/**
 * Hop-by-hop and origin-scoped headers that must not be replayed upstream.
 * `host` in particular would make PostHog resolve against the app's own origin.
 */
const STRIPPED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "content-length",
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
  "content-length",
]);

function forwardedHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const [name, value] of request.headers) {
    if (!STRIPPED_REQUEST_HEADERS.has(name.toLowerCase())) headers.set(name, value);
  }
  return headers;
}

function upstreamHeaders(response: Response): Headers {
  const headers = new Headers();
  for (const [name, value] of response.headers) {
    if (!STRIPPED_RESPONSE_HEADERS.has(name.toLowerCase())) headers.set(name, value);
  }
  return headers;
}

/**
 * Proxy one `/ingest/**` request to `host`, never throwing.
 *
 * - No `host` configured → 503. Nothing to proxy to; the client stops trying.
 * - Upstream unreachable, erroring, or slow → 502 with ONE concise log line.
 *   Deliberately not `console.error` with the stack: a misconfigured host would
 *   otherwise emit an unbounded stack dump per captured event.
 */
export async function proxyToAnalytics(
  request: Request,
  path: string[],
  host: string | undefined,
): Promise<Response> {
  if (!host) return new Response(null, { status: 503 });

  const incoming = new URL(request.url);
  // `${host}` may carry a base path, so join rather than replace. The trailing
  // slash is preserved from the incoming path — PostHog's endpoints expect it
  // and `skipTrailingSlashRedirect` keeps Next from normalising it away.
  const target = new URL(
    `${host.replace(/\/$/, "")}/${path.join("/")}${incoming.pathname.endsWith("/") ? "/" : ""}${incoming.search}`,
  );

  try {
    const response = await fetch(target, {
      method: request.method,
      headers: forwardedHeaders(request),
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      // Streaming an incoming body through `fetch` requires duplex mode.
      ...(request.body ? { duplex: "half" } : {}),
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    } as RequestInit);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: upstreamHeaders(response),
    });
  } catch (error) {
    console.warn(
      `[analytics] /ingest upstream unreachable (${target.origin}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return new Response(null, { status: 502 });
  }
}
