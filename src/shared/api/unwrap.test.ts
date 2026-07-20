import { describe, expect, it } from "vitest";
import { unwrap } from "./unwrap";

describe("unwrap", () => {
  it("returns the data field of an auth envelope", () => {
    expect(unwrap({ data: { message: "ok" } })).toEqual({ message: "ok" });
  });

  it("preserves the payload type verbatim (arrays, primitives)", () => {
    expect(unwrap({ data: [1, 2, 3] })).toEqual([1, 2, 3]);
    expect(unwrap({ data: null })).toBeNull();
  });
});
