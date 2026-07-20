import ky from "ky";
import { mockWorkerReady } from "@/shared/api/mocks/worker-ready";
import { env } from "@/shared/config/env";

export const http = ky.create({
  // ky 2.x renamed `prefixUrl` → `baseUrl` for an absolute API origin (and throws if you
  // pass `prefixUrl`). Request paths are passed WITHOUT a leading slash (e.g. `users/${id}`,
  // `posts`, `auth/login`) so they resolve under the base. The MSW handlers build their URLs
  // with `new URL(path, NEXT_PUBLIC_API_URL)`, so they match.
  baseUrl: env.NEXT_PUBLIC_API_URL,
  credentials: "include",
  retry: { limit: 2 },
  timeout: 15_000,
  hooks: {
    beforeRequest: [
      // In mock mode the browser must not fetch before the MSW worker is live;
      // resolved immediately on the server and when mocking is disabled.
      () => mockWorkerReady().then(() => undefined),
      ({ request }) => request.headers.set("Accept", "application/json"),
    ],
  },
});
