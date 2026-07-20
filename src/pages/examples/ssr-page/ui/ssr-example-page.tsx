import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { postQueries } from "@/entities/post";
import { getQueryClient } from "@/shared/api/query-client";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n";
import { getSsrExamplePost } from "../api/get-ssr-example-post";
import { CommentsList } from "./comments-list";
import { CommentsSkeleton } from "./comments-skeleton";

export async function SsrExamplePage({ id }: { id: string }) {
  const queryClient = getQueryClient();
  // Awaited (request-deduped): the post ships with the first flush of HTML.
  const post = await getSsrExamplePost(id);
  // NOT awaited: the pending comments query dehydrates into the boundary and
  // streams to the client once the slow endpoint resolves.
  void queryClient.prefetchQuery(postQueries.comments(id));
  const t = await getTranslations("SsrExample");
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-10 p-8">
      <nav className="text-sm">
        <Link href={routes.dashboard} className="text-muted-foreground hover:text-foreground">
          &larr; {t("backToDashboard")}
        </Link>
      </nav>
      <article className="flex flex-col gap-3">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
          {t("eyebrow")}
        </p>
        <h1 className="font-semibold text-3xl">{post.title}</h1>
        <p className="leading-7">{post.body}</p>
        <p className="text-muted-foreground text-sm">{t("intro")}</p>
      </article>
      <section className="flex flex-col gap-4 border-t pt-8">
        <h2 className="font-semibold text-lg">{t("commentsTitle")}</h2>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <Suspense fallback={<CommentsSkeleton />}>
            <CommentsList postId={id} />
          </Suspense>
        </HydrationBoundary>
      </section>
    </main>
  );
}
