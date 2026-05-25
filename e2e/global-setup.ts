import type { FullConfig } from "@playwright/test";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3000";

  // Retry sign-up until the auth route is compiled and ready.
  // Next.js (Turbopack dev) compiles routes lazily on first request, which can
  // take a few seconds after the server reports "ready".
  // Better Auth requires the Origin header to accept email/password requests.
  const maxAttempts = 15;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${baseURL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: baseURL,
        },
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
          name: "E2E User",
        }),
        signal: AbortSignal.timeout(10_000),
      });
      // 200 = created, 4xx = user exists or validation failure — both mean done.
      // 5xx = transient (server not ready) — retry.
      if (res.status < 500) return;
    } catch {
      // Network / timeout error — server not ready yet, retry after delay
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}
