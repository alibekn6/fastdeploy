import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
// Browser-only: the `ws.link()` WebSocket mock lives here, never in the shared
// `handlers` array that `instrumentation.ts` / Node integration tests register.
import { wsHandlers } from "./ws-handlers";

export const worker = setupWorker(...handlers, ...wsHandlers);
