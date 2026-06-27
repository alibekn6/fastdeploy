import { env } from "@/shared/config/env";
import { routing } from "@/shared/i18n";

export const SITE_URL = env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Absolute URL for `path` under `locale`, honoring as-needed prefixing. Root "/" yields no trailing slash. */
export function localizedUrl(locale: string, path: string) {
  const base = locale === routing.defaultLocale ? SITE_URL : `${SITE_URL}/${locale}`;
  return path === "/" ? base : `${base}${path}`;
}

export function buildAlternates(locale: string, path: string) {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, localizedUrl(l, path)]));
  return {
    canonical: localizedUrl(locale, path),
    languages: { ...languages, "x-default": localizedUrl(routing.defaultLocale, path) },
  };
}
