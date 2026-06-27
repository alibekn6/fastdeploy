"use client";

import { PostHogProvider as PHProvider } from "posthog-js/react";
import { type ReactNode, useEffect } from "react";
import { env } from "@/shared/config/env";
import { initAnalytics, posthog } from "./posthog";

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return <>{children}</>; // NO-OP passthrough

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
