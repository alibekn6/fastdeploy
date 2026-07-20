import { getTranslations } from "next-intl/server";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n";
import { WebsocketLive } from "./websocket-live";

export async function WebsocketExamplePage() {
  const t = await getTranslations("WsExample");
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-10 p-8">
      <nav className="text-sm">
        <Link href={routes.home} className="text-muted-foreground hover:text-foreground">
          &larr; {t("backHome")}
        </Link>
      </nav>
      <article className="flex flex-col gap-3">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
          {t("eyebrow")}
        </p>
        <h1 className="font-semibold text-3xl">{t("title")}</h1>
        <p className="leading-7 text-muted-foreground">{t("intro")}</p>
        {/* Mandated on-page fidelity warning (spec §2.7): WS cookie auth on the
            upgrade is not covered by this repo's test suite. */}
        <p
          role="note"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-foreground text-sm leading-6"
        >
          {t("warning")}
        </p>
      </article>
      <WebsocketLive />
    </main>
  );
}
