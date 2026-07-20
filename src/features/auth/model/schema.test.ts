import { describe, expect, it } from "vitest";
import { makeSignInSchema, makeSignUpSchema } from "./schema";

const t = (key: string) => `t:${key}`;

describe("makeSignInSchema", () => {
  it("accepts a valid email and any non-empty password (presence only)", () => {
    const result = makeSignInSchema(t).safeParse({
      email: "user@example.com",
      password: "x",
    });
    expect(result.success).toBe(true);
  });

  it("localizes the invalid-email and required-password messages via t", () => {
    const result = makeSignInSchema(t).safeParse({ email: "nope", password: "" });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((i) => i.message);
    expect(messages).toContain("t:emailInvalid");
    expect(messages).toContain("t:passwordRequired");
  });
});

describe("makeSignUpSchema", () => {
  const valid = {
    email: "user@example.com",
    password: "a".repeat(12),
    confirmPassword: "a".repeat(12),
  };

  it("accepts a valid email with a matching 12-char password (length only, no composition)", () => {
    expect(makeSignUpSchema(t).safeParse(valid).success).toBe(true);
  });

  it("accepts a 128-char password (inclusive max)", () => {
    const password = "a".repeat(128);
    const result = makeSignUpSchema(t).safeParse({ ...valid, password, confirmPassword: password });
    expect(result.success).toBe(true);
  });

  it("rejects an 11-char password with the localized too-short message", () => {
    const password = "a".repeat(11);
    const result = makeSignUpSchema(t).safeParse({ ...valid, password, confirmPassword: password });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toContain("t:passwordTooShort");
  });

  it("rejects a 129-char password with the localized too-long message", () => {
    const password = "a".repeat(129);
    const result = makeSignUpSchema(t).safeParse({ ...valid, password, confirmPassword: password });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toContain("t:passwordTooLong");
  });

  it("rejects a mismatched confirmation with the localized message on the confirmation field", () => {
    const result = makeSignUpSchema(t).safeParse({ ...valid, confirmPassword: "b".repeat(12) });
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) => i.message === "t:passwordMismatch");
    expect(issue?.path).toEqual(["confirmPassword"]);
  });

  it("localizes the invalid-email message via t", () => {
    const result = makeSignUpSchema(t).safeParse({ ...valid, email: "nope" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toContain("t:emailInvalid");
  });
});
