import { afterEach, describe, expect, it, vi } from "vitest";
import { SseEventSchema } from "@/shared/api/sse-schema";
import { createSseStream } from "./sse-stream";

const decoder = new TextDecoder();

afterEach(() => {
  vi.useRealTimers();
});

describe("createSseStream", () => {
  it("emits a `notice` frame immediately, validated by the shared schema", async () => {
    const controller = new AbortController();
    const stream = createSseStream(controller.signal, { intervalMs: 60_000 });
    const reader = stream.getReader();

    const { value, done } = await reader.read();
    expect(done).toBe(false);
    const text = decoder.decode(value);
    expect(text).toMatch(/^event: notice\ndata: .+\n\n$/s);

    const payload = JSON.parse(text.slice(text.indexOf("data: ") + "data: ".length).trim());
    const parsed = SseEventSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.type).toBe("notice");

    controller.abort();
    await reader.cancel();
  });

  it("emits `update` frames on the configured interval, distinct from `notice`", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const stream = createSseStream(controller.signal, { intervalMs: 1_000 });
    const reader = stream.getReader();

    await reader.read(); // notice

    const readPromise = reader.read();
    await vi.advanceTimersByTimeAsync(1_000);
    const { value } = await readPromise;
    const text = decoder.decode(value);
    expect(text).toMatch(/^event: update\ndata: .+\n\n$/s);

    controller.abort();
    await reader.cancel();
  });

  it("stops pushing and closes the stream once the abort signal fires", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const stream = createSseStream(controller.signal, { intervalMs: 1_000 });
    const reader = stream.getReader();

    await reader.read(); // notice
    expect(vi.getTimerCount()).toBe(1); // the update interval

    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0); // interval cleared, no zombie pushes

    const { done } = await reader.read();
    expect(done).toBe(true); // the stream closed — no further frames possible
  });

  it("clears the interval when the consumer stops reading (cancel), without throwing", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const stream = createSseStream(controller.signal, { intervalMs: 1_000 });
    const reader = stream.getReader();

    await reader.read(); // notice
    expect(vi.getTimerCount()).toBe(1);

    await expect(reader.cancel()).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
});
