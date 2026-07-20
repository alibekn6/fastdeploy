import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirnameURL = dirname(fileURLToPath(import.meta.url));

// Pinned so the suites are hermetic: `NEXT_PUBLIC_WS_URL` is a required env
// var, and CI has no `.env`. Tests must not depend on a developer's machine.
const WS_URL = "wss://api.example.com/ws";

export default defineConfig({
  plugins: [react()],
  // Vite 8 resolves tsconfig `paths` (the `@/*` alias) natively — replaces the
  // deprecated vite-tsconfig-paths plugin.
  resolve: { tsconfigPaths: true },
  envPrefix: ["NEXT_PUBLIC_", "NODE_"],
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          // Pinned, NOT inherited from `.env`/CI: the mock-gate tests assert
          // production behaviour (no `document.cookie` write, no token sink),
          // and the ky `beforeRequest` hook awaits `mockWorkerReady()` — which
          // never resolves in jsdom without a browser worker. Tests needing
          // mock mode opt in explicitly with `vi.stubEnv`.
          env: { NEXT_PUBLIC_API_MOCKING: "disabled", NEXT_PUBLIC_WS_URL: WS_URL },
          // `proxy.test.ts` sits at the root next to the middleware it tests.
          include: ["src/**/*.{test,spec}.{ts,tsx}", "proxy.test.ts"],
          // next-intl's middleware imports extensionless `next/server`, which
          // Node ESM can't resolve — let Vite's resolver process the package.
          server: { deps: { inline: ["next-intl"] } },
          exclude: ["src/**/*.integration.{test,spec}.{ts,tsx}"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          // Pinned for the same reason as the unit project: these tests install
          // MSW explicitly via `setupServer`, so they never need app-level mock
          // mode — and the jsdom-docblocked files would otherwise hang on the
          // ky `mockWorkerReady()` gate waiting for a worker that never starts.
          env: { NEXT_PUBLIC_API_MOCKING: "disabled", NEXT_PUBLIC_WS_URL: WS_URL },
          // `.tsx` so UI slices can be exercised at the MSW network boundary
          // (per-file `@vitest-environment jsdom` docblocks own the DOM).
          include: ["src/**/*.integration.{test,spec}.{ts,tsx}"],
          // Same reason as the unit project: next-intl imports extensionless
          // `next/navigation`, which Node ESM can't resolve.
          server: { deps: { inline: ["next-intl"] } },
          hookTimeout: 120_000,
          testTimeout: 60_000,
          pool: "forks",
          setupFiles: [],
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: join(dirnameURL, ".storybook") })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**"],
      exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/**/*.d.ts"],
    },
  },
});
