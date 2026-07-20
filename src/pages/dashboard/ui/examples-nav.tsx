import { useTranslations } from "next-intl";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";

const EXAMPLES = [
  {
    href: routes.examplesSsr("1"),
    titleKey: "ssrExampleTitle",
    descriptionKey: "ssrExampleDescription",
  },
  {
    href: routes.examplesWebsocket,
    titleKey: "wsExampleTitle",
    descriptionKey: "wsExampleDescription",
  },
  {
    href: routes.examplesSse,
    titleKey: "sseExampleTitle",
    descriptionKey: "sseExampleDescription",
  },
] as const;

/**
 * Discoverable links to every `/examples/*` route, reachable by click alone
 * from a logged-in dashboard. `Button asChild` gets each card the same
 * accessibility-audited focus ring as every other interactive control in the
 * app (`focus-visible:ring-[3px] focus-visible:ring-ring/50`) for free.
 */
export function ExamplesNav() {
  const t = useTranslations("Dashboard");
  return (
    <nav aria-label={t("examplesHeading")} className="flex flex-col gap-3">
      <h2 className="font-semibold text-lg">{t("examplesHeading")}</h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {EXAMPLES.map((example) => (
          <li key={example.href}>
            <Button
              asChild
              variant="outline"
              className="h-auto w-full flex-col items-start justify-start gap-1 whitespace-normal p-4 text-left"
            >
              <Link href={example.href}>
                <span className="font-medium">{t(example.titleKey)}</span>
                <span className="font-normal text-muted-foreground text-sm">
                  {t(example.descriptionKey)}
                </span>
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
