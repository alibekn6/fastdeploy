import { analyticsConfigured } from "./consent";
import { posthog } from "./posthog";

export function identifyUser(distinctId: string, props?: Record<string, unknown>) {
  if (!analyticsConfigured()) return;
  posthog.identify(distinctId, props);
}

export function resetUser() {
  if (!analyticsConfigured()) return;
  posthog.reset();
}
