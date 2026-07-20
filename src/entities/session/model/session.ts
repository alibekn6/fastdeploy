import type { User } from "@/entities/user/@x/session";

export type Session = { authenticated: boolean; user: User | null };

/** A user is authenticated only while active — a deactivated account never authenticates. */
export function makeSession(user: User | null): Session {
  return { authenticated: user !== null && user.is_active, user };
}

export const anonymousSession: Session = { authenticated: false, user: null };
