"use client";
import { useFormatter, useTranslations } from "next-intl";
import type { SseEventMessage } from "@/shared/api/sse-schema";

const EVENT_TYPE_LABEL: Record<SseEventMessage["type"], "eventTypeNotice" | "eventTypeUpdate"> = {
  notice: "eventTypeNotice",
  update: "eventTypeUpdate",
};

export function MessageList({ messages }: { messages: SseEventMessage[] }) {
  const t = useTranslations("SseExample");
  const format = useFormatter();

  if (messages.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <ol aria-label={t("messagesTitle")} className="flex flex-col divide-y">
      {messages.map((message) => (
        <li key={message.id} className="flex items-baseline justify-between gap-4 py-3">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 text-muted-foreground text-xs uppercase tracking-widest">
              {t(EVENT_TYPE_LABEL[message.type])}
            </span>
            <span className="truncate text-sm leading-6">{message.text}</span>
          </span>
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
