import { env } from "@/shared/config/env";

/**
 * Absolute external-API URL for an MSW handler pattern. Per-story and per-test
 * overrides must build their URLs exactly the way `handlers.ts` does, or the
 * override silently fails to match and the happy-path handler answers instead.
 */
export const apiUrl = (path: string) => new URL(path, env.NEXT_PUBLIC_API_URL).toString();
