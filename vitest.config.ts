import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
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
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**"],
      exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/**/*.d.ts"],
    },
  },
});
