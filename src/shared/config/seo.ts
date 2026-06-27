import { env } from "@/shared/config/env";
import { routing } from "@/shared/i18n";

const HOST = env.NEXT_PUBLIC_SITE_URL;

/** Absolute URL for `path` under `locale`, honoring as-needed prefixing. Root "/" yields no trailing slash. */
export function localizedUrl(locale: string, path: string) {
  const base = locale === routing.defaultLocale ? HOST : `${HOST}/${locale}`;
  return path === "/" ? base : `${base}${path}`;
}

export function buildAlternates(locale: string, path: string) {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, localizedUrl(l, path)]));
  return {
    canonical: localizedUrl(locale, path),
    languages: { ...languages, "x-default": localizedUrl(routing.defaultLocale, path) },
  };
}
