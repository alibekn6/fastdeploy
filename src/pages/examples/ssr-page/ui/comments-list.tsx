"use client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { postQueries } from "@/entities/post";

export function CommentsList({ postId }: { postId: string }) {
  // The server both selects and orders the comments (10 newest, `at`
  // descending) — render response order, never re-sort client-side.
  const { data: comments } = useSuspenseQuery(postQueries.comments(postId));
  const t = useTranslations("SsrExample");
  const format = useFormatter();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        {t("commentsCount", { count: comments.length })}
      </p>
      <ol aria-label={t("commentsTitle")} className="flex flex-col divide-y">
        {comments.map((comment) => (
          <li key={comment.id} className="flex flex-col gap-1 py-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-medium text-sm">{comment.author}</span>
              <time dateTime={comment.at} className="shrink-0 text-muted-foreground text-xs">
                {/* Fixed UTC keeps server and client renders identical during hydration. */}
                {format.dateTime(new Date(comment.at), { dateStyle: "medium", timeZone: "UTC" })}
              </time>
            </div>
            <p className="text-sm leading-6">{comment.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
