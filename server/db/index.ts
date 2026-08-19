import { requireDatabaseUrl } from "../config";
import { createDbClient, type Db } from "./client";

// Lazy init: creating a client throws without DATABASE_URL, and Next evaluates
// module scope at build time — a plain memoized function (never a Proxy) keeps
// env-less builds working.
let _db: Db | null = null;

export function getDb(): Db {
  if (!_db) _db = createDbClient(requireDatabaseUrl());
  return _db;
}
