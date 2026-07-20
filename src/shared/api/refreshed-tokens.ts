/** Tokens the MOCK `auth/refresh` returns in its body (access token only — no rotation). */
export type RefreshedMockTokens = { access_token: string; refresh_token?: string };

type RefreshedTokensSink = (tokens: RefreshedMockTokens) => void;

/**
 * Inversion seam for the refresh hook's mock-token side effect.
 *
 * In browser mock mode the refreshed access token has to land in a readable
 * `document.cookie` (a Service Worker cannot set httpOnly cookies), or every
 * subsequent 401 re-refreshes against the stale cookie. The writer lives in
 * `features/auth` and `shared` must not import it, so the app layer registers
 * it here instead. Unregistered — Node, production, tests — this is a no-op,
 * which is exactly the production contract: only the backend sets cookies.
 */
let sink: RefreshedTokensSink | null = null;

export function setRefreshedTokensSink(next: RefreshedTokensSink | null): void {
  sink = next;
}

export function notifyRefreshedTokens(tokens: RefreshedMockTokens): void {
  sink?.(tokens);
}
