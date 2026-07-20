"use client";
import { useTranslations } from "next-intl";
import { useWebSocket } from "@/shared/api/websocket";
import { env } from "@/shared/config/env";
import { ConnectionStatus } from "./connection-status";
import { MessageList } from "./message-list";

// The single client boundary that owns the reconnecting hook. Kept thin so the
// two presentational children (ConnectionStatus, MessageList) stay storyable
// from plain props (bead .10 writes their stories).
export function WebsocketLive() {
  const t = useTranslations("WsExample");
  const { status, messages } = useWebSocket(env.NEXT_PUBLIC_WS_URL);
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
