import { describe, expect, it } from "vitest";
import { makeSignInSchema } from "./schema";

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
