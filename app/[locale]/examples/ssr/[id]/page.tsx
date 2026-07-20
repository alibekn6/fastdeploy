import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSsrExamplePost, SsrExamplePage } from "@/pages/examples/ssr-page";
import { routes } from "@/shared/config/routes";
import { buildAlternates } from "@/shared/config/seo";
import { routing } from "@/shared/i18n";

// Fetches the external API per request (and streams comments) — never at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  // Request-deduped with the layout's and page's fetch (React cache()).
  const post = await getSsrExamplePost(id);
  const t = await getTranslations({ locale, namespace: "SsrExample" });
  const description = t("metaDescription", { title: post.title });
  return {
    title: post.title,
    description,
    // A per-segment `openGraph` object REPLACES the root layout's (no deep
    // merge) — restate the image or link previews silently lose it.
    openGraph: { title: post.title, description, images: ["/opengraph-image"] },
    alternates: buildAlternates(locale, routes.examplesSsr(id)),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <SsrExamplePage id={id} />;
}
