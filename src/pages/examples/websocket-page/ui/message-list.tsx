"use client";
import { useFormatter, useTranslations } from "next-intl";
import type { WsMessage } from "@/shared/api/websocket";

export function MessageList({ messages }: { messages: WsMessage[] }) {
  const t = useTranslations("WsExample");
  const format = useFormatter();

  if (messages.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <ol aria-label={t("messagesTitle")} className="flex flex-col divide-y">
      {messages.map((message) => (
        <li key={message.id} className="flex items-baseline justify-between gap-4 py-3">
          <span className="text-sm leading-6">{message.text}</span>
          <time
            dateTime={message.at}
            className="shrink-0 text-muted-foreground text-xs tabular-nums"
          >
            {format.dateTime(new Date(message.at), { timeStyle: "medium", timeZone: "UTC" })}
          </time>
        </li>
      ))}
    </ol>
  );
}
