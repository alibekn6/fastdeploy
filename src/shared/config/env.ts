import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const isLocalhost = (hostname: string) => hostname === "localhost" || hostname === "127.0.0.1";

// Zod runs refinements even when the preceding `.url()` check failed, so the
// predicates must stay total: an unparseable value is simply "not secure".
const parsedUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

// Build-time transport enforcement (spec §2.7, unit-tested — A20): Secure
// httpOnly cookies imply TLS, so plaintext schemes are a build failure instead
// of a silent misconfiguration. Localhost is the sole exception (local dev).

/** `https:` always; `http:` only for localhost/127.0.0.1. */
export const secureApiUrl = z
  .string()
  .url()
  .refine(
    (value) => {
      const url = parsedUrl(value);
      return url !== null && (url.protocol !== "http:" || isLocalhost(url.hostname));
    },
    { message: "NEXT_PUBLIC_API_URL must use https:// unless the host is localhost" },
  );

/** `wss:` always; plaintext `ws:` only for localhost/127.0.0.1 (TLS protects cookies on the upgrade). */
export const secureWsUrl = z
  .string()
  .url()
  .refine(
    (value) => {
      const url = parsedUrl(value);
      if (url === null) return false;
      // The scheme must be a WebSocket one either way; localhost only relaxes TLS.
      if (url.protocol !== "ws:" && url.protocol !== "wss:") return false;
      return url.protocol === "wss:" || isLocalhost(url.hostname);
    },
    {
      message: "NEXT_PUBLIC_WS_URL must be a ws(s):// URL, and wss:// unless the host is localhost",
    },
  );

export const env = createEnv({
  server: { NODE_ENV: z.enum(["development", "production", "test"]).default("development") },
  client: {
    NEXT_PUBLIC_API_URL: secureApiUrl,
    // Required, NOT defaulted: a deploy that forgets this must fail loudly rather
    // than silently connect to an example domain. The Storybook scripts set it
    // explicitly, and SKIP_ENV_VALIDATION covers env-less builds.
    NEXT_PUBLIC_WS_URL: secureWsUrl,
    NEXT_PUBLIC_API_MOCKING: z.enum(["enabled", "disabled"]).default("disabled"),
    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
