import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { MswProvider, QueryProvider } from "@/app/providers";
import { ConsentBanner, PageViewTracker, PostHogProvider } from "@/shared/analytics";
import { env } from "@/shared/config/env";
import { routing } from "@/shared/i18n";
import "@/app/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: { template: "%s | nextjs-frontend", default: "nextjs-frontend" },
  description: "A Next.js 16 FSD frontend boilerplate.",
  openGraph: { type: "website", siteName: "nextjs-frontend", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  colorScheme: "dark light",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <PostHogProvider>
            <MswProvider>
              <QueryProvider>{children}</QueryProvider>
            </MswProvider>
            <PageViewTracker />
            <ConsentBanner />
          </PostHogProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
