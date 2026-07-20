import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { getSsrExamplePost } from "@/pages/examples/ssr-page";
import { routing } from "@/shared/i18n/routing";

// The 404 gate lives in the segment LAYOUT on purpose: page.tsx renders inside
// the loading.tsx Suspense boundary, so by the time a page-thrown notFound()
// surfaces the 200 shell has already flushed. The layout renders outside that
// boundary — awaiting the (request-deduped) post here throws notFound() before
// the first byte, producing a real 404 response.
export default async function SsrExampleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  await getSsrExamplePost(id);
  return children;
}
