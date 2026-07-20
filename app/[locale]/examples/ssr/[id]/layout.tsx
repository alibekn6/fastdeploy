import { getSsrExamplePost } from "@/pages/examples/ssr-page";

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
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getSsrExamplePost(id);
  return children;
}
