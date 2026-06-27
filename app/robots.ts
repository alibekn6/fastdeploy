import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/config/seo";

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/login", "/api/"] },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
