import { useTranslations } from "next-intl";

/** Suspense fallback shaped like the final comments layout (count, author row, one body line). */
export function CommentsSkeleton() {
  const t = useTranslations("SsrExample");
  return (
    <div role="status" aria-label={t("commentsLoading")} className="flex flex-col gap-2">
      <div aria-hidden className="h-4 w-24 animate-pulse rounded bg-foreground/10" />
      <div aria-hidden className="flex flex-col divide-y">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex flex-col gap-2 py-4">
            <div className="flex items-baseline justify-between gap-4">
              <div className="h-4 w-32 animate-pulse rounded bg-foreground/10" />
              <div className="h-3 w-20 animate-pulse rounded bg-foreground/10" />
            </div>
            <div className="h-4 w-4/5 animate-pulse rounded bg-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
