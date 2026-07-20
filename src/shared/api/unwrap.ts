/**
 * Auth-block-only `{data: T}` envelope unwrap (spec §2.4). Non-auth endpoints
 * stay flat — never route them through this. Non-2xx responses never reach it:
 * ky throws `HTTPError` first, and callers branch on `error.response.status`.
 */
export function unwrap<T>(body: { data: T }): T {
  return body.data;
}
