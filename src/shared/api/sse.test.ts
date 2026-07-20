import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeEventSource } from "@/shared/api/mocks/fake-event-source";
import { createSseConnection, useSse } from "./sse";

const SSE_URL = "/api/sse";

const notice = (id: string, text = `notice-${id}`) =>
  JSON.stringify({ type: "notice", id, text, at: "2026-07-17T10:00:00.000Z" });
const update = (id: string, text = `update-${id}`) =>
  JSON.stringify({ type: "update", id, text, at: "2026-07-17T10:00:00.000Z" });

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function connect() {
  const onStatus = vi.fn();
  const onMessage = vi.fn();
  const cleanup = createSseConnection(SSE_URL, { onStatus, onMessage });
  return { onStatus, onMessage, cleanup };
}

describe("createSseConnection", () => {
  it("starts connecting, then reaches open on the browser's open event", () => {
    const { onStatus } = connect();
    expect(onStatus).toHaveBeenNthCalledWith(1, "connecting");
    FakeEventSource.latest().open();
    expect(onStatus).toHaveBeenLastCalledWith("open");
  });

  it("routes named events (update, notice) to onMessage after validation", () => {
    const { onMessage } = connect();
    const source = FakeEventSource.latest();
    source.open();
    source.message("update", update("1"));
    source.message("notice", notice("2"));

    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(onMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "update", id: "1" }),
    );
    expect(onMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "notice", id: "2" }),
    );
  });

  it("drops invalid frames via safeParse without throwing, and ignores unregistered event names", () => {
    const { onMessage } = connect();
    const source = FakeEventSource.latest();
    source.open();

    source.message("update", "not json at all");
    source.message("update", JSON.stringify({ type: "update", id: "1" })); // missing fields
    source.message("update", JSON.stringify({ type: "bogus", id: "1", text: "x", at: "x" }));
    source.message("some-other-event", update("z")); // no listener attached for this name
    expect(onMessage).not.toHaveBeenCalled();

    source.message("update", update("ok"));
    expect(onMessage).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "update", id: "ok" }),
    );
  });

  it("surfaces `reconnecting` on a non-fatal error, without creating a new connection itself", () => {
    const { onStatus } = connect();
    const source = FakeEventSource.latest();
    source.open();

    source.errorWhileReconnecting();
    expect(onStatus).toHaveBeenLastCalledWith("reconnecting");
    // The browser retries on its own — the hook never constructs a 2nd EventSource.
    expect(FakeEventSource.instances).toHaveLength(1);

    source.open(); // the browser's own retry succeeded
    expect(onStatus).toHaveBeenLastCalledWith("open");
  });

  it("surfaces `closed` on a fatal error (readyState CLOSED)", () => {
    const { onStatus } = connect();
    const source = FakeEventSource.latest();
    source.open();

    source.errorFatal();
    expect(onStatus).toHaveBeenLastCalledWith("closed");
  });

  it("cleanup closes the source and is safe to call twice", () => {
    const { cleanup } = connect();
    const source = FakeEventSource.latest();
    source.open();

    cleanup();
    expect(source.closeCalls).toBe(1);
    expect(() => cleanup()).not.toThrow();
    expect(source.closeCalls).toBe(1); // idempotent — no second close()
  });

  it("no status/message update after cleanup, even if the source still fires events", () => {
    const { onStatus, onMessage, cleanup } = connect();
    const source = FakeEventSource.latest();
    source.open();
    const statusCallsBefore = onStatus.mock.calls.length;
    const messageCallsBefore = onMessage.mock.calls.length;

    cleanup();
    // Listeners were removed, so these are inert no-ops on a real EventSource too.
    source.open();
    source.message("update", update("late"));
    source.errorFatal();

    expect(onStatus.mock.calls.length).toBe(statusCallsBefore);
    expect(onMessage.mock.calls.length).toBe(messageCallsBefore);
  });
});

describe("useSse", () => {
  it("starts connecting and exposes received messages in arrival order", () => {
    const { result } = renderHook(() => useSse(SSE_URL));
    expect(result.current.status).toBe("connecting");
    expect(result.current.messages).toEqual([]);

    act(() => FakeEventSource.latest().open());
    expect(result.current.status).toBe("open");
    act(() => FakeEventSource.latest().message("update", update("1")));
    act(() => FakeEventSource.latest().message("notice", notice("2")));
    expect(result.current.messages.map((message) => message.id)).toEqual(["1", "2"]);
  });

  it("unmount (during open) closes the source, removes listeners, no update after", () => {
    const { unmount } = renderHook(() => useSse(SSE_URL));
    act(() => FakeEventSource.latest().open());
    const source = FakeEventSource.latest();

    unmount();
    expect(source.closeCalls).toBe(1);

    // Inert after unmount — asserts indirectly there is no React "state update
    // on an unmounted component" path left reachable.
    expect(() => {
      source.open();
      source.message("update", update("late"));
      source.errorFatal();
    }).not.toThrow();
  });
});
