import { afterEach, describe, expect, it, vi } from "vitest";
import { notifyRefreshedTokens, setRefreshedTokensSink } from "./refreshed-tokens";

afterEach(() => setRefreshedTokensSink(null));

describe("refreshed-tokens sink", () => {
  it("is a no-op until a sink is registered", () => {
    expect(() => notifyRefreshedTokens({ access_token: "at-1" })).not.toThrow();
  });

  it("forwards the refreshed tokens to the registered sink", () => {
    const sink = vi.fn();
    setRefreshedTokensSink(sink);
    notifyRefreshedTokens({ access_token: "at-1" });
    expect(sink).toHaveBeenCalledExactlyOnceWith({ access_token: "at-1" });
  });

  it("stops forwarding once the sink is cleared", () => {
    const sink = vi.fn();
    setRefreshedTokensSink(sink);
    setRefreshedTokensSink(null);
    notifyRefreshedTokens({ access_token: "at-1" });
    expect(sink).not.toHaveBeenCalled();
  });
});
