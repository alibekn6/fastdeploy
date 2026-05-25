import { describe, expect, it } from "vitest";
import { postKeys } from "./post-queries";

describe("postKeys", () => {
  it("builds a hierarchical list key", () => expect(postKeys.list()).toEqual(["posts", "list"]));
});
