import { describe, expect, it } from "vitest";
import type { User } from "@/entities/user/@x/session";
import { anonymousSession, makeSession } from "./session";

const activeUser: User = {
  id: "u1",
  email: "user@example.com",
  name: "user",
  is_active: true,
};

describe("makeSession", () => {
  it("authenticates an active user", () => {
    expect(makeSession(activeUser)).toEqual({ authenticated: true, user: activeUser });
  });

  it("does not authenticate an inactive user", () => {
    const inactive = { ...activeUser, is_active: false };
    expect(makeSession(inactive)).toEqual({ authenticated: false, user: inactive });
  });

  it("maps null to the anonymous session shape", () => {
    expect(makeSession(null)).toEqual({ authenticated: false, user: null });
  });
});

describe("anonymousSession", () => {
  it("is unauthenticated with no user", () => {
    expect(anonymousSession).toEqual({ authenticated: false, user: null });
  });
});
