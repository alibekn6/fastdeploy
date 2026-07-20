"use client";
import { useTranslations } from "next-intl";
import { useSession } from "@/entities/session";
import { resetUser } from "@/shared/analytics";
import { http } from "@/shared/api/http";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/shared/config/auth";
import { env } from "@/shared/config/env";
import { routes } from "@/shared/config/routes";
import { useRouter } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";

export function Header() {
  const router = useRouter();
  const t = useTranslations("Common");
  const { data: session } = useSession();
  return (
    <header className="flex items-center justify-between border-b p-4">
      <span className="font-semibold">{t("appName")}</span>
      <div className="flex items-center gap-3">
        {session?.user && (
          <span data-testid="user-email" className="text-sm text-muted-foreground">
            {session.user.email}
          </span>
        )}
        <Button
          variant="outline"
          onClick={async () => {
            await http.post("auth/logout");
            // Backend clears the httpOnly cookies; in mock mode clear the readable ones.
            if (env.NEXT_PUBLIC_API_MOCKING === "enabled") {
              document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
              document.cookie = `${REFRESH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
            }
            resetUser();
            router.push(routes.login);
          }}
        >
          {t("signOut")}
        </Button>
      </div>
    </header>
  );
}
