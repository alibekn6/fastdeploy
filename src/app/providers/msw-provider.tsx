"use client";
import { type ReactNode, useEffect, useState } from "react";
import { env } from "@/shared/config/env";

const ENABLED = env.NEXT_PUBLIC_API_MOCKING === "enabled";

export function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!ENABLED);
  useEffect(() => {
    if (!ENABLED) return;
    let active = true;
    void (async () => {
      const { worker } = await import("@/shared/api/mocks/browser");
      await worker.start({ onUnhandledRequest: "bypass" });
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);
  if (!ready) return null;
  return <>{children}</>;
}
