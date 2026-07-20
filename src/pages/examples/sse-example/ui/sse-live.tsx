"use client";
import { useTranslations } from "next-intl";
import { useSse } from "@/shared/api/sse";
import { ConnectionStatus } from "./connection-status";
import { MessageList } from "./message-list";

/** Same-origin route handler (`app/api/sse/route.ts`) — ordinary HTTP, no env var needed. */
const SSE_STREAM_URL = "/api/sse";

// The single client boundary that owns the EventSource hook. Kept thin so the
// two presentational children (ConnectionStatus, MessageList) stay storyable
// from plain props — mirrors `websocket-live.tsx`.
export function SseLive() {
  const t = useTranslations("SseExample");
  const { status, messages } = useSse(SSE_STREAM_URL);
  // Newest first, bounded so a long-lived demo connection stays readable.
  const recent = messages.slice(-25).reverse();
  return (
    <section className="flex flex-col gap-4 border-t pt-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-lg">{t("messagesTitle")}</h2>
        <ConnectionStatus status={status} />
      </div>
      <MessageList messages={recent} />
    </section>
  );
}
