import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { requireDatabaseUrl } from "../config";
import * as schema from "./schema";

// Lazy init: `neon()` throws without DATABASE_URL, and Next evaluates module
// scope at build time — a plain memoized function (never a Proxy) keeps
// env-less builds working.
function createDb() {
  return drizzle(neon(requireDatabaseUrl()), { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
