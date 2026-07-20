import { act, renderHook } from "@testing-library/react";
import { HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { countingRefreshHandler } from "@/shared/api/mocks/counting-refresh-handler";
import { FakeWebSocket } from "@/shared/api/mocks/fake-websocket";
import { server } from "@/shared/api/mocks/node";
import { createWebSocketConnection, useWebSocket, WsMessageSchema } from "./websocket";

const WS_URL = "wss://api.example.com/ws";

const frame = (id: string, text = `text-${id}`) =>
  JSON.stringify({ type: "message", id, text, at: "2026-07-17T10:00:00.000Z" });

beforeEach(() => {
  FakeWebSocket.reset();
  vi.stubGlobal("WebSocket", FakeWebSocket);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function connect() {
  const onStatus = vi.fn();
  const onMessage = vi.fn();
  const cleanup = createWebSocketConnection(WS_URL, { onStatus, onMessage });
  return { onStatus, onMessage, cleanup };
}

describe("createWebSocketConnection", () => {
  it("A14: abnormal closes reconnect with 1s → 2s → 4s backoff, capped at 4s", () => {
    vi.useFakeTimers();
    const { onStatus, cleanup } = connect();
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(onStatus).toHaveBeenLastCalledWith("connecting");

    FakeWebSocket.latest().open();
    expect(onStatus).toHaveBeenLastCalledWith("connected");

    FakeWebSocket.latest().serverClose(1006);
    expect(onStatus).toHaveBeenLastCalledWith("reconnecting");
    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1); // 1s
    expect(FakeWebSocket.instances).toHaveLength(2);

    FakeWebSocket.latest().serverClose(1006);
    vi.advanceTimersByTime(1999);
    expect(FakeWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1); // 2s
    expect(FakeWebSocket.instances).toHaveLength(3);

    FakeWebSocket.latest().serverClose(1006);
    vi.advanceTimersByTime(3999);
    expect(FakeWebSocket.instances).toHaveLength(3);
    vi.advanceTimersByTime(1); // 4s
    expect(FakeWebSocket.instances).toHaveLength(4);

    FakeWebSocket.latest().serverClose(1006);
    vi.advanceTimersByTime(4000); // still 4s — capped
    expect(FakeWebSocket.instances).toHaveLength(5);

    cleanup();
  });

  it("A14: the backoff resets to 1s after a successful open", () => {
    vi.useFakeTimers();
    const { cleanup } = connect();
    FakeWebSocket.latest().open();
    FakeWebSocket.latest().serverClose(1006);
    vi.advanceTimersByTime(1000); // first retry at 1s
    expect(FakeWebSocket.instances).toHaveLength(2);
    FakeWebSocket.latest().serverClose(1006);
    vi.advanceTimersByTime(2000); // second retry at 2s
    expect(FakeWebSocket.instances).toHaveLength(3);

    FakeWebSocket.latest().open(); // successful open resets the backoff
    FakeWebSocket.latest().serverClose(1006);
    vi.advanceTimersByTime(1000); // next retry back at 1s
    expect(FakeWebSocket.instances).toHaveLength(4);

    cleanup();
  });

  it("A14: a code-1000 close stays closed — disconnected, zero timers, no new socket", () => {
    vi.useFakeTimers();
    const { onStatus } = connect();
    FakeWebSocket.latest().open();
    FakeWebSocket.latest().serverClose(1000);
    expect(onStatus).toHaveBeenLastCalledWith("disconnected");
    expect(vi.getTimerCount()).toBe(0);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("A14: cleanup closes the live socket and is safe to call twice", () => {
    vi.useFakeTimers();
    const { cleanup } = connect();
    FakeWebSocket.latest().open();

    cleanup();
    expect(FakeWebSocket.latest().closeCalls.length).toBeGreaterThan(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(() => cleanup()).not.toThrow();

    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.instances).toHaveLength(1); // no zombie reconnects
  });

  it("A14: cleanup clears a pending reconnect timer", () => {
    vi.useFakeTimers();
    const { cleanup } = connect();
    FakeWebSocket.latest().open();
    FakeWebSocket.latest().serverClose(1006);
    expect(vi.getTimerCount()).toBe(1);

    cleanup();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("drops invalid frames via safeParse without throwing", () => {
    const { onMessage } = connect();
    const socket = FakeWebSocket.latest();
    socket.open();

    socket.message("not json at all");
    socket.message(JSON.stringify({ type: "simulate-auth-expiry" }));
    socket.message(JSON.stringify({ type: "message", id: "1" })); // missing fields
    expect(onMessage).not.toHaveBeenCalled();

    socket.message(frame("1", "hello"));
    expect(onMessage).toHaveBeenCalledExactlyOnceWith({
      type: "message",
      id: "1",
      text: "hello",
      at: "2026-07-17T10:00:00.000Z",
    });
  });

  it("A15: a 4001 close refreshes the session once, reconnects, and updates resume", async () => {
    const { handler, spy } = countingRefreshHandler(() =>
      HttpResponse.json({ data: { message: "Refreshed" } }),
    );
    server.use(handler);
    const { onStatus, onMessage, cleanup } = connect();
    FakeWebSocket.latest().open();

    FakeWebSocket.latest().serverClose(4001);
    expect(onStatus).toHaveBeenLastCalledWith("reconnecting");
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));

    FakeWebSocket.latest().open();
    expect(onStatus).toHaveBeenLastCalledWith("connected");
    FakeWebSocket.latest().message(frame("after-refresh"));
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ id: "after-refresh" }));

    cleanup();
  });

  it("A15: a failed refresh after 4001 ends disconnected — zero reconnects, no redirect", async () => {
    const { handler, spy } = countingRefreshHandler(() =>
      HttpResponse.json(
        { error: { code: "invalid_refresh", message: "Revoked" } },
        { status: 401 },
      ),
    );
    server.use(handler);
    const pathnameBefore = window.location.pathname;
    const { onStatus } = connect();
    FakeWebSocket.latest().open();

    FakeWebSocket.latest().serverClose(4001);
    await vi.waitFor(() => expect(onStatus).toHaveBeenLastCalledWith("disconnected"));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(FakeWebSocket.instances).toHaveLength(1); // zero reconnect attempts
    // The session escape belongs to the HTTP hook — the WS hook never redirects.
    expect(window.location.pathname).toBe(pathnameBefore);
  });
});

describe("useWebSocket", () => {
  it("starts connecting and exposes received messages in arrival order", () => {
    const { result } = renderHook(() => useWebSocket(WS_URL));
    expect(result.current.status).toBe("connecting");
    expect(result.current.messages).toEqual([]);

    act(() => FakeWebSocket.latest().open());
    expect(result.current.status).toBe("connected");
    act(() => FakeWebSocket.latest().message(frame("1")));
    act(() => FakeWebSocket.latest().message(frame("2")));
    expect(result.current.messages.map((message) => message.id)).toEqual(["1", "2"]);
  });

  it("A14: unmount closes the socket and clears timers", () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useWebSocket(WS_URL));
    act(() => FakeWebSocket.latest().open());

    unmount();
    expect(FakeWebSocket.latest().closeCalls.length).toBeGreaterThan(0);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});

describe("WsMessageSchema", () => {
  it("accepts only the demo message contract", () => {
    expect(
      WsMessageSchema.safeParse({
        type: "message",
        id: "m1",
        text: "hi",
        at: "2026-07-17T10:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(WsMessageSchema.safeParse({ type: "other", id: "m1", text: "hi", at: "" }).success).toBe(
      false,
    );
  });
});
