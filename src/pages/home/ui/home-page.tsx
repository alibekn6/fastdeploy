import { useTranslations } from "next-intl";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";

export function HomePage() {
  const t = useTranslations("Home");
  const common = useTranslations("Common");
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">{common("appName")}</h1>
      <p className="text-muted-foreground">{t("tagline")}</p>
      <Button asChild>
        <Link href={routes.login}>{t("getStarted")}</Link>
      </Button>
    </main>
  );
}
