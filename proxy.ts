import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/shared/config/auth";
import { routes } from "@/shared/config/routes";

export function proxy(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE))
    return NextResponse.redirect(new URL(routes.login, request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/dashboard/:path*"] };
