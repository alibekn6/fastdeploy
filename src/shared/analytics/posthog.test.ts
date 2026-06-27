import { beforeEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();
vi.mock("posthog-js", () => ({ default: { init } }));

describe("initAnalytics", () => {
  beforeEach(() => init.mockClear());

  it("is a no-op when NEXT_PUBLIC_POSTHOG_KEY is unset", async () => {
    const { initAnalytics } = await import("./posthog");
    initAnalytics();
    expect(init).not.toHaveBeenCalled();
  });
});
