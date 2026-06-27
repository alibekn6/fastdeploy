import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { MswProvider, QueryProvider } from "@/app/providers";
import { ConsentBanner, PageViewTracker, PostHogProvider } from "@/shared/analytics";
import { SITE_URL } from "@/shared/config/seo";
import { routing } from "@/shared/i18n";
import "@/app/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { template: "%s | nextjs-frontend", default: "nextjs-frontend" },
  description: "A Next.js 16 FSD frontend boilerplate.",
  openGraph: { type: "website", siteName: "nextjs-frontend", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image" },
};

// The boilerplate ships only a light theme (globals.css defines no `.dark`
// palette), so declare `light` — otherwise the browser applies dark UA defaults
// under OS dark mode and unstyled text (e.g. the outline sign-out button) turns
// white-on-white. Add a dark `@theme` + a `.dark` toggle to support dark mode.
export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
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
      <body className="bg-background text-foreground">
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
