import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WebsocketExamplePage } from "@/pages/examples/websocket-page";
import { routes } from "@/shared/config/routes";
import { buildAlternates } from "@/shared/config/seo";
import { routing } from "@/shared/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "WsExample" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: buildAlternates(locale, routes.examplesWebsocket),
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <WebsocketExamplePage />;
}
