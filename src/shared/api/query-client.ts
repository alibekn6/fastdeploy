import { defaultShouldDehydrateQuery, isServer, QueryClient } from "@tanstack/react-query";
import { cache } from "react";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
      dehydrate: {
        shouldDehydrateQuery: (q) => defaultShouldDehydrateQuery(q) || q.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;
// react's cache() is server-only; the isServer guard ensures it's only invoked during RSC
// (per-request memoization). On the client we keep a module singleton. Do NOT "simplify" this.
const getServerQueryClient = cache(makeQueryClient);

export function getQueryClient() {
  if (isServer) return getServerQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
