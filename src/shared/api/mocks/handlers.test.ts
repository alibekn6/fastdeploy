import { describe, expect, it } from "vitest";
import { mintMockJwt } from "./handlers";

const decodeSegment = (segment: string) => {
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "="))) as Record<
    string,
    unknown
  >;
};

describe("mintMockJwt — pinned unsigned-JWT format", () => {
  it("splits on '.' into header / payload / literal 'mock' signature", () => {
    const token = mintMockJwt({ sub: "u1", email: "user@example.com", ttlSeconds: 900 });
    const segments = token.split(".");
    expect(segments).toHaveLength(3);
    expect(segments[2]).toBe("mock");

    expect(decodeSegment(segments[0] as string)).toEqual({ alg: "none", typ: "JWT" });

    const payload = decodeSegment(segments[1] as string);
    expect(payload.sub).toBe("u1");
    expect(payload.email).toBe("user@example.com");
    expect(typeof payload.exp).toBe("number");
    expect(typeof payload.iat).toBe("number");
    expect(payload.exp as number).toBe((payload.iat as number) + 900);
  });
});
