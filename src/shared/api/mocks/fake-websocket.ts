/**
 * Hand-rolled `WebSocket` test double for unit-testing the reconnect state
 * machine in `src/shared/api/websocket.ts` (A14/A15) — installed per test via
 * `vi.stubGlobal("WebSocket", FakeWebSocket)`. The shipped ws mock is MSW
 * `ws.link()` (browser-only); this double exists because Node/jsdom test
 * projects never register it (spec §2.7) and because fake-timer backoff
 * assertions need direct, synchronous control of open/message/close events.
 */
export class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: FakeWebSocket[] = [];

  static reset(): void {
    FakeWebSocket.instances = [];
  }

  static latest(): FakeWebSocket {
    const socket = FakeWebSocket.instances.at(-1);
    if (!socket) throw new Error("no FakeWebSocket has been constructed yet");
    return socket;
  }

  readonly url: string;
  readyState: number = FakeWebSocket.CONNECTING;
  /** Every `close()` call made by production code, in order. */
  closeCalls: Array<{ code?: number; reason?: string }> = [];

  #listeners = new Map<string, Set<EventListener>>();

  constructor(url: string | URL) {
    this.url = String(url);
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions) {
    const set = this.#listeners.get(type) ?? new Set();
    set.add(listener);
    this.#listeners.set(type, set);
    options?.signal?.addEventListener("abort", () => set.delete(listener));
  }

  removeEventListener(type: string, listener: EventListener) {
    this.#listeners.get(type)?.delete(listener);
  }

  close(code?: number, reason?: string) {
    this.closeCalls.push({ code, reason });
    this.readyState = FakeWebSocket.CLOSED;
  }

  send(_data: string) {
    // receive-only demo contract: production code never sends.
  }

  #emit(type: string, event: Event) {
    for (const listener of this.#listeners.get(type) ?? []) listener(event);
  }

  // Test drivers — simulate server-originated events.

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.#emit("open", new Event("open"));
  }

  message(data: string) {
    this.#emit("message", new MessageEvent("message", { data }));
  }

  serverClose(code: number) {
    this.readyState = FakeWebSocket.CLOSED;
    this.#emit("close", new CloseEvent("close", { code }));
  }
}
