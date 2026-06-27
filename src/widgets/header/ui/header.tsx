"use client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { http } from "@/shared/api/http";
import { SESSION_COOKIE } from "@/shared/config/auth";
import { env } from "@/shared/config/env";
import { routes } from "@/shared/config/routes";
import { Button } from "@/shared/ui/button";

export function Header() {
  const router = useRouter();
  const t = useTranslations("Common");
  return (
    <header className="flex items-center justify-between border-b p-4">
      <span className="font-semibold">{t("appName")}</span>
      <Button
        variant="outline"
        onClick={async () => {
          await http.post("auth/logout");
          // Backend clears the httpOnly cookie; in mock mode clear the readable one.
          if (env.NEXT_PUBLIC_API_MOCKING === "enabled") {
            document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
          }
          router.push(routes.login);
        }}
      >
        {t("signOut")}
      </Button>
    </header>
  );
}
