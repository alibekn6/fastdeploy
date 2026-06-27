import type { MetadataRoute } from "next";
import { localizedUrl } from "@/shared/config/seo";
import { routing } from "@/shared/i18n";

const paths = ["/"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: localizedUrl(routing.defaultLocale, path),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
    alternates: {
      languages: Object.fromEntries(routing.locales.map((l) => [l, localizedUrl(l, path)])),
    },
  }));
}
