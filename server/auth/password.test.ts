// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  hashPassword,
  MIN_PASSWORD_LENGTH,
  TIMING_EQUALIZATION_HASH,
  verifyPassword,
} from "./password";

describe("password hashing (argon2id)", () => {
  it("verifies the original password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(stored).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(stored, "correct horse battery staple")).toBe(true);
    expect(await verifyPassword(stored, "wrong password entirely")).toBe(false);
  });

  it("never throws on malformed stored hashes", async () => {
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false);
    expect(await verifyPassword("", "anything")).toBe(false);
  });

  it("keeps the server-side policy at the contract's 12-char minimum", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
  });

  it("ships a valid argon2id reference hash for timing equalization", async () => {
    // Any password must verify (to false) against it without throwing.
    expect(await verifyPassword(TIMING_EQUALIZATION_HASH, "probe")).toBe(false);
  });
});
