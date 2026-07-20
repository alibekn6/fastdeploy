/**
 * Hand-rolled `EventSource` test double for unit-testing the SSE hook in
 * `src/shared/api/sse.ts` — installed per test via
 * `vi.stubGlobal("EventSource", FakeEventSource)`. Mirrors `FakeWebSocket`:
 * jsdom does not implement `EventSource`, so tests need direct, synchronous
 * control over open/message/error events, including the two distinct shapes
 * a real browser's "error" event can carry (about to auto-retry vs. gave up
 * for good) via `readyState`.
 */
export class FakeEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  static instances: FakeEventSource[] = [];

  static reset(): void {
    FakeEventSource.instances = [];
  }

  static latest(): FakeEventSource {
    const source = FakeEventSource.instances.at(-1);
    if (!source) throw new Error("no FakeEventSource has been constructed yet");
    return source;
  }

  readonly url: string;
  readyState: number = FakeEventSource.CONNECTING;
  /** Every `close()` call made by production code, in order. */
  closeCalls = 0;

  #listeners = new Map<string, Set<EventListener>>();

  constructor(url: string | URL) {
    this.url = String(url);
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    const set = this.#listeners.get(type) ?? new Set();
    set.add(listener);
    this.#listeners.set(type, set);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.#listeners.get(type)?.delete(listener);
  }

  close() {
    this.closeCalls++;
    this.readyState = FakeEventSource.CLOSED;
  }

  #emit(type: string, event: Event) {
    for (const listener of this.#listeners.get(type) ?? []) listener(event);
  }

  // Test drivers — simulate browser-originated events.

  open() {
    this.readyState = FakeEventSource.OPEN;
    this.#emit("open", new Event("open"));
  }

  message(eventName: string, data: string) {
    this.#emit(eventName, new MessageEvent(eventName, { data }));
  }

  /** The connection dropped, but the browser is about to retry on its own. */
  errorWhileReconnecting() {
    this.readyState = FakeEventSource.CONNECTING;
    this.#emit("error", new Event("error"));
  }

  /** A fatal error (e.g. a non-2xx status) — the browser gives up for good. */
  errorFatal() {
    this.readyState = FakeEventSource.CLOSED;
    this.#emit("error", new Event("error"));
  }
}
