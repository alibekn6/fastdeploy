import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { SESSION_COOKIE } from "@/shared/config/auth";
import { routes } from "@/shared/config/routes";
import { routing } from "@/shared/i18n";

const handleI18n = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/^\/(ru|kk)(?=\/|$)/, "");
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (!request.cookies.get(SESSION_COOKIE)) {
      return NextResponse.redirect(new URL(routes.login, request.url));
    }
  }
  return handleI18n(request);
}

// Exclude `ingest` so the PostHog reverse-proxy rewrite (next.config.ts) isn't
// locale-prefixed by the i18n middleware (which would 404 the capture endpoints).
export const config = { matcher: "/((?!api|ingest|_next|_vercel|.*\\..*).*)" };
