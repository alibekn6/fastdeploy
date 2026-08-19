import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "postgresql",
  // biome-ignore lint/style/noProcessEnv: drizzle-kit runs outside the app's validated env
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
