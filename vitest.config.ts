import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirnameURL = dirname(fileURLToPath(import.meta.url));

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
          // `proxy.test.ts` sits at the root next to the middleware it tests.
          include: ["src/**/*.{test,spec}.{ts,tsx}", "proxy.test.ts"],
          // next-intl's middleware imports extensionless `next/server`, which
          // Node ESM can't resolve — let Vite's resolver process the package.
          server: { deps: { inline: ["next-intl"] } },
          exclude: ["src/**/*.integration.{test,spec}.ts"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.integration.{test,spec}.ts"],
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
