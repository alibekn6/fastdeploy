import type { QueryClient } from "@tanstack/react-query";
import { resetUser } from "@/shared/analytics";
import { http } from "@/shared/api/http";
import { routes } from "@/shared/config/routes";
import { clearMockSessionCookies } from "./mock-session-cookies";

/** The locale-aware next-intl router (`useRouter` from `@/shared/i18n`). */
type LocaleRouter = { push: (href: string) => void };

/**
 * Sign-out flow: `auth/logout` (the backend deletes both httpOnly cookies —
 * no auth check, always 200) → expire the mock-mode readable cookies → drop
 * the ENTIRE query cache (stale authenticated data must not survive into
 * another user's session on a shared browser) → analytics `reset` → the
 * locale-aware home redirect (`/` for `en`, `/{locale}` otherwise).
 */
export async function signOut(queryClient: QueryClient, router: LocaleRouter): Promise<void> {
  await http.post("auth/logout");
  clearMockSessionCookies();
  queryClient.clear();
  resetUser();
  router.push(routes.home);
}
