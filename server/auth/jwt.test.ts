// @vitest-environment node
// Server-side unit: t3-env blocks server vars whenever `window` exists, so
// these must not run under the unit project's default jsdom.
import { describe, expect, it } from "vitest";
import { ACCESS_TTL_SECONDS, signAccessToken, signRefreshToken, verifyToken } from "./jwt";

const user = { id: "3f8a2b44-0000-4000-8000-000000000001", email: "ada@example.com" };

describe("jwt sign/verify (real security boundary)", () => {
  it("round-trips access-token claims and a sane expiry", async () => {
    const token = await signAccessToken(user);
    const claims = await verifyToken(token);
    expect(claims).toMatchObject({ sub: user.id, email: user.email });
    expect(claims?.jti).toBeUndefined();
    // The middleware route guard decodes the same payload unverified — the
    // token must stay a standard 3-part JWT with numeric exp.
    const payload = JSON.parse(Buffer.from(token.split(".")[1] as string, "base64url").toString());
    expect(payload.exp - payload.iat).toBe(ACCESS_TTL_SECONDS);
  });

  it("round-trips the refresh token's jti", async () => {
    const jti = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
    const claims = await verifyToken(await signRefreshToken(user, jti));
    expect(claims).toMatchObject({ sub: user.id, email: user.email, jti });
  });

  it("rejects a tampered signature and garbage input", async () => {
    const token = await signAccessToken(user);
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(await verifyToken(tampered)).toBeNull();
    expect(await verifyToken("not-a-jwt")).toBeNull();
    expect(await verifyToken("")).toBeNull();
  });

  it("rejects an alg:none token (mock-style tokens carry no signature)", async () => {
    const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const forged = `${b64({ alg: "none", typ: "JWT" })}.${b64({
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 900,
      iat: Math.floor(Date.now() / 1000),
    })}.mock`;
    expect(await verifyToken(forged)).toBeNull();
  });
});
