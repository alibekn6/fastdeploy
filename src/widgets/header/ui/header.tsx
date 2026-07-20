"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useSession } from "@/entities/session";
import { signOut } from "@/features/auth";
import { routes } from "@/shared/config/routes";
import { Link, useRouter } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";

export function Header() {
  const router = useRouter();
  const t = useTranslations("Common");
  const tAuth = useTranslations("Auth");
  const queryClient = useQueryClient();
  const { data: session, isPending } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function onSignOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut(queryClient, router);
    } catch {
      // Logout failed at the network seam: local state was NOT cleared, so the
      // header honestly stays signed in — announce and let the user retry.
      setSignOutError(tAuth("serverError"));
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="flex items-center justify-between border-b p-4">
      <span className="font-semibold">{t("appName")}</span>
      {/* Session slot — min-h matches the h-9 controls so the three states
          (skeleton / email + sign out / sign in) never shift the layout. */}
      <div className="flex min-h-9 items-center gap-3">
        {isPending ? (
          <div
            data-testid="session-skeleton"
            aria-hidden="true"
            className="flex items-center gap-3"
          >
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          </div>
        ) : session?.authenticated && session.user ? (
          <>
            {signOutError && (
              <p role="alert" className="text-sm text-destructive">
                {signOutError}
              </p>
            )}
            <span data-testid="user-email" className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
            <Button variant="outline" disabled={signingOut} onClick={onSignOut}>
              {t("signOut")}
            </Button>
          </>
        ) : (
          // Anonymous (or session query failed): the honest signed-out state.
          <Button asChild variant="outline">
            <Link href={routes.login}>{t("signIn")}</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
