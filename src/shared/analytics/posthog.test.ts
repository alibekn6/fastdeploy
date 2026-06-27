import { beforeEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();
vi.mock("posthog-js", () => ({ default: { init } }));
// Keep the test hermetic: assert the no-op path regardless of any ambient
// NEXT_PUBLIC_POSTHOG_KEY in the developer's local `.env`.
vi.mock("@/shared/config/env", () => ({
  env: { NEXT_PUBLIC_POSTHOG_KEY: undefined, NEXT_PUBLIC_POSTHOG_HOST: undefined },
}));

describe("initAnalytics", () => {
  beforeEach(() => init.mockClear());

  it("is a no-op when NEXT_PUBLIC_POSTHOG_KEY is unset", async () => {
    const { initAnalytics } = await import("./posthog");
    initAnalytics();
    expect(init).not.toHaveBeenCalled();
  });
});
