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

export const config = { matcher: "/((?!api|_next|_vercel|.*\\..*).*)" };
