// Test-only failure injection for the comments endpoint (mock mode only — the
// signals below are consulted exclusively by the MSW handlers, which are only
// registered under NEXT_PUBLIC_API_MOCKING=enabled).
//
// PER-REQUEST BY CONSTRUCTION — there is deliberately NO module-level mutable
// state here. Playwright runs `fullyParallel` with several workers against ONE
// dev server, so a process-wide flag let one worker's failure override break a
// concurrent worker's spec. Every signal below is scoped to a single request or
// to a single browser context instead:
//
// - Browser runtime (client refetch): `globalThis.__mswCommentsFailure`,
//   injected per navigation with `addInitScript` — scoped to one Playwright
//   browser context, so it cannot leak into another worker's page.
// - Node runtime (SSR prefetch): the `x-mock-comments-failure` request header.
//   `node.ts` derives it per Next request from the MOCK_COMMENTS_FAILURE_COOKIE
//   the spec plants on its own browser context; integration tests set the
//   header directly.

declare global {
  var __mswCommentsFailure: number | null | undefined;
}

/** Per-request failure signal understood by the shared comments handler. */
export const COMMENTS_FAILURE_HEADER = "x-mock-comments-failure";

/**
 * Cookie the e2e spec plants on its own browser context; `node.ts` turns it
 * into the header above for the SSR fetch that the same navigation triggers.
 */
export const MOCK_COMMENTS_FAILURE_COOKIE = "__mock_comments_failure";

/** Parse a failure status from a header/cookie value; anything invalid = no failure. */
export function parseFailureStatus(value: string | null | undefined): number | null {
  if (!value) return null;
  const status = Number(value);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : null;
}

/**
 * Resolve the failure status for ONE request: its own header first, then the
 * browser-context global. Never reads shared process state.
 */
export function commentsFailureFor(request: Request): number | null {
  return (
    parseFailureStatus(request.headers.get(COMMENTS_FAILURE_HEADER)) ??
    globalThis.__mswCommentsFailure ??
    null
  );
}
