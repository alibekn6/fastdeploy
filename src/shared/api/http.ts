import ky from "ky";
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
  hooks: { beforeRequest: [({ request }) => request.headers.set("Accept", "application/json")] },
});
