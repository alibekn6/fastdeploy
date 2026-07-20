"use client";
import { useTranslations } from "next-intl";
import type { WsStatus } from "@/shared/api/websocket";
import { cn } from "@/shared/lib/utils";

// A colored dot per connection state. The dot is decorative (aria-hidden) — the
// localized text label carries the state accessibly, so a11y contrast rests on
// the foreground/muted tokens, not the status hue. Fixed palette values read
// identically in both themes (spec §2.8 dark-theme contrast gate).
type StatusLabelKey =
  | "statusConnecting"
  | "statusConnected"
  | "statusReconnecting"
  | "statusDisconnected";

const STATUS_STYLES: Record<WsStatus, { dot: string; labelKey: StatusLabelKey }> = {
  connecting: { dot: "bg-amber-500", labelKey: "statusConnecting" },
  connected: { dot: "bg-emerald-500", labelKey: "statusConnected" },
  reconnecting: { dot: "bg-amber-500", labelKey: "statusReconnecting" },
  disconnected: { dot: "bg-red-500", labelKey: "statusDisconnected" },
};

const PULSING: ReadonlySet<WsStatus> = new Set<WsStatus>(["connecting", "reconnecting"]);

export function ConnectionStatus({ status }: { status: WsStatus }) {
  const t = useTranslations("WsExample");
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
