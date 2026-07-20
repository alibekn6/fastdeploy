import { getTranslations } from "next-intl/server";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n";
import { SseLive } from "./sse-live";

export async function SseExamplePage() {
  const t = await getTranslations("SseExample");
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
        {/* The key contrast with the WebSocket example (bead F11): SSE is
            ordinary HTTP, so it rides this app's own origin, the same httpOnly
            auth cookies, and this app's own proxy — no separate upgrade
            handshake to reason about. */}
        <p
          role="note"
          className="rounded-md border border-sky-500/40 bg-sky-500/10 p-3 text-foreground text-sm leading-6"
        >
          {t("note")}
        </p>
      </article>
      <SseLive />
    </main>
  );
}
