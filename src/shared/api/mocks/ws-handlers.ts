import { ws } from "msw";
import { env } from "@/shared/config/env";

/**
 * BROWSER-ONLY WebSocket mock (spec §2.7): `ws.link()` speaks text frames in
 * the Service Worker only — Storybook, `dev:mock`, E2E. It is deliberately NOT
 * added to the shared `handlers` array (which `instrumentation.ts` and Node
 * integration tests register), so the Node runtime never touches it. Fidelity
 * gap: the mock cannot read cookies on the upgrade, so cookie auth is untested
 * against it — the page carries that warning verbatim.
 */
const wsLink = ws.link(env.NEXT_PUBLIC_WS_URL);

let nextId = 1;

export const wsHandlers = [
  wsLink.addEventListener("connection", ({ client }) => {
    // Push one message per second while connected, indefinitely.
    const interval = setInterval(() => {
      const id = String(nextId++);
      client.send(
        JSON.stringify({
          type: "message",
          id,
          text: `Live update #${id}`,
          at: new Date().toISOString(),
        }),
      );
    }, 1_000);

    client.addEventListener("close", () => clearInterval(interval));

    // The single client→server control frame: simulate an auth-expiry close
    // (4001) so the reconnecting hook exercises its refresh branch. No other
    // client message is part of the contract (receive-only demo).
    client.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      try {
        const parsed = JSON.parse(event.data) as { type?: string };
        if (parsed.type === "simulate-auth-expiry") {
          clearInterval(interval);
          client.close(4001, "auth expired");
        }
      } catch {
        // ignore malformed control frames
      }
    });
  }),
];
