// Test-only failure injection for the comments endpoint (mock mode only — the
// state is consulted exclusively by the MSW handlers, which never run outside
// NEXT_PUBLIC_API_MOCKING=enabled). E2E specs cannot reach `server.use(...)`
// inside the Next server process, so they flip this flag instead:
//
// - Node runtime (SSR prefetch): `POST /api/mock-control` → a server-side fetch
//   to `__mock/comments-failure` that MSW itself intercepts, so the flag flips
//   inside the same module graph `instrumentation.ts` registered.
// - Browser runtime (client refetch): the browser worker resolves handlers in
//   page context, whose module state resets on navigation — so Playwright
//   injects `globalThis.__mswCommentsFailure` via `addInitScript` instead.

declare global {
  var __mswCommentsFailure: number | null | undefined;
}

let failure: number | null = null;

export function setCommentsFailure(status: number | null) {
  failure = status;
}

export function getCommentsFailure(): number | null {
  return globalThis.__mswCommentsFailure ?? failure;
}
