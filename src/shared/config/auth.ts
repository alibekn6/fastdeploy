// Cookie names for the dual-token scheme the backend sets (Secure, httpOnly,
// SameSite=Lax, Path=/). `proxy.ts` decodes the access token (unsigned) and
// presence-checks the refresh token to gate protected routes.
export const SESSION_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
