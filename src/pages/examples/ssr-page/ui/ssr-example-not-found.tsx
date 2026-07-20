import { useTranslations } from "next-intl";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";

export function SsrExampleNotFound() {
  const t = useTranslations("SsrExample");
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-semibold text-2xl">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground">{t("notFoundBody")}</p>
      <div className="flex items-center gap-3">
        <Button asChild>
          <Link href={routes.examplesSsr("1")}>{t("notFoundCta")}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href={routes.home}>{t("backHome")}</Link>
        </Button>
      </div>
    </main>
  );
}
