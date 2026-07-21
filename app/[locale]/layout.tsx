import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { MswProvider, QueryProvider, ThemeProvider } from "@/app/providers";
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

// Both palettes ship (globals.css defines the `.dark` token overrides), so the
// browser is told to expect either — this is what makes UA-styled surfaces like
// form controls and scrollbars follow the active theme. `themeColor` is split
// per scheme so the mobile browser chrome matches `--color-background`.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
  colorScheme: "light dark",
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
  // Only the namespaces client components actually read are serialized into the
  // RSC payload; server-only ones (Dashboard, Home, Metadata) stay on the server.
  // Adding a `useTranslations("X")` to a client component means adding X here.
  const messages = await getMessages();
  const clientMessages = {
    Common: messages.Common,
    Auth: messages.Auth,
    Consent: messages.Consent,
    Error: messages.Error,
    SsrExample: messages.SsrExample,
    WsExample: messages.WsExample,
    SseExample: messages.SseExample,
  };
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <NextIntlClientProvider messages={clientMessages}>
          <ThemeProvider>
            <PostHogProvider>
              <MswProvider>
                <QueryProvider>{children}</QueryProvider>
              </MswProvider>
              <PageViewTracker />
              <ConsentBanner />
            </PostHogProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
