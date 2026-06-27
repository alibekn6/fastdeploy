import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { MswProvider, QueryProvider } from "@/app/providers";
import { ConsentBanner, PageViewTracker, PostHogProvider } from "@/shared/analytics";
import { routing } from "@/shared/i18n";
import "@/app/styles/globals.css";

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
