"use client";
import { useQueryClient, useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { startTransition } from "react";
import { postKeys } from "@/entities/post";
import { Button } from "@/shared/ui/button";

/**
 * Shared fallback for the App Router error boundaries (root + SSR-example
 * segment). TanStack Query caches prefetch errors silently, so retry must
 * invalidate the post-detail + comments query keys FIRST — `postKeys.details()`
 * prefixes both families — and only then re-render. The re-render also clears
 * TanStack's suspense error-reset boundary (or `useSuspenseQuery` re-throws the
 * cached error on remount) and refreshes the router, Next's documented recovery
 * for errors that originated in the server render.
 */
export function ErrorFallback({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");
  const queryClient = useQueryClient();
  const { reset: resetQueryErrors } = useQueryErrorResetBoundary();
  const router = useRouter();
  return (
    <main
      data-testid="error-boundary-fallback"
      className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <h1 className="font-semibold text-2xl">{t("title")}</h1>
      <p className="text-muted-foreground">{t("body")}</p>
      <Button
        onClick={() => {
          void queryClient.invalidateQueries({ queryKey: postKeys.details() });
          resetQueryErrors();
          startTransition(() => {
            router.refresh();
            reset();
          });
        }}
      >
        {t("retry")}
      </Button>
    </main>
  );
}
