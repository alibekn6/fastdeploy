import type { User } from "@/entities/user/@x/session";

export type Session = { authenticated: boolean; user: User | null };
export const anonymousSession: Session = { authenticated: false, user: null };
