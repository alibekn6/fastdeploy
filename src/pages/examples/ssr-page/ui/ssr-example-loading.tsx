import { useTranslations } from "next-intl";

/** Route-segment loading skeleton mirroring the final page layout. */
export function SsrExampleLoading() {
  const t = useTranslations("SsrExample");
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-10 p-8">
      <div role="status" aria-label={t("loading")} className="flex flex-col gap-10">
        <div aria-hidden className="flex flex-col gap-10">
          <div className="h-4 w-28 animate-pulse rounded bg-foreground/10" />
          <div className="flex flex-col gap-3">
            <div className="h-3 w-40 animate-pulse rounded bg-foreground/10" />
            <div className="h-8 w-2/3 animate-pulse rounded bg-foreground/10" />
            <div className="h-4 w-full animate-pulse rounded bg-foreground/10" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-foreground/10" />
          </div>
          <div className="flex flex-col gap-4 border-t pt-8">
            <div className="h-5 w-28 animate-pulse rounded bg-foreground/10" />
            <div className="h-4 w-24 animate-pulse rounded bg-foreground/10" />
            <div className="flex flex-col divide-y">
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
        </div>
      </div>
    </main>
  );
}
