import { env } from "@/shared/config/env";

/**
 * Raised when a real-backend capability is used without its env. Routes map it
 * to a 500 `server_misconfigured` instead of leaking a stack trace.
 */
export class ServerConfigError extends Error {
  constructor(missing: string) {
    super(`Real backend mode requires ${missing} — see docs/backend.md`);
    this.name = "ServerConfigError";
  }
}

export function requireDatabaseUrl(): string {
  if (!env.DATABASE_URL) throw new ServerConfigError("DATABASE_URL");
  return env.DATABASE_URL;
}

export function requireJwtSecret(): string {
  if (!env.JWT_SECRET) throw new ServerConfigError("JWT_SECRET");
  return env.JWT_SECRET;
}
