"use client";
import { useTranslations } from "next-intl";
import type { SseStatus } from "@/shared/api/sse";
import { cn } from "@/shared/lib/utils";

// A colored dot per connection state. The dot is decorative (aria-hidden) — the
// localized text label carries the state accessibly, so a11y contrast rests on
// the foreground/muted tokens, not the status hue. Fixed palette values read
// identically in both themes (mirrors the WS example's connection-status).
type StatusLabelKey = "statusConnecting" | "statusOpen" | "statusReconnecting" | "statusClosed";

const STATUS_STYLES: Record<SseStatus, { dot: string; labelKey: StatusLabelKey }> = {
  connecting: { dot: "bg-amber-500", labelKey: "statusConnecting" },
  open: { dot: "bg-emerald-500", labelKey: "statusOpen" },
  reconnecting: { dot: "bg-amber-500", labelKey: "statusReconnecting" },
  closed: { dot: "bg-red-500", labelKey: "statusClosed" },
};

const PULSING: ReadonlySet<SseStatus> = new Set<SseStatus>(["connecting", "reconnecting"]);

export function ConnectionStatus({ status }: { status: SseStatus }) {
  const t = useTranslations("SseExample");
  const { dot, labelKey } = STATUS_STYLES[status];
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 font-medium text-foreground text-sm"
    >
      <span className="relative flex size-2">
        {PULSING.has(status) && (
          <span
            aria-hidden
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-75",
              dot,
            )}
          />
        )}
        <span aria-hidden className={cn("relative inline-flex size-2 rounded-full", dot)} />
      </span>
      {t(labelKey)}
    </span>
  );
}
