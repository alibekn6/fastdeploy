import { env } from "@/shared/config/env";
import { routing } from "@/shared/i18n";

const HOST = env.NEXT_PUBLIC_SITE_URL;
const prefix = (locale: string, path: string) =>
  locale === routing.defaultLocale ? `${HOST}${path}` : `${HOST}/${locale}${path}`;

export function buildAlternates(locale: string, path: string) {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, prefix(l, path)]));
  return {
    canonical: prefix(locale, path),
    languages: { ...languages, "x-default": prefix(routing.defaultLocale, path) },
  };
}
