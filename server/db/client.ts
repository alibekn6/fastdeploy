import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = ReturnType<typeof createNeonDb>;

function createNeonDb(url: string) {
  return drizzleNeon(neon(url), { schema });
}

function isNeonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

/**
 * Neon's HTTP driver only speaks to Neon's proxy, so any other Postgres
 * (local docker, self-hosted) goes through node-postgres. Both drizzle
 * instances expose the identical query API for everything this app uses;
 * the cast unifies their otherwise-divergent generics.
 */
export function createDbClient(url: string): Db {
  if (isNeonUrl(url)) return createNeonDb(url);
  return drizzlePg(new Pool({ connectionString: url }), { schema }) as unknown as Db;
}
