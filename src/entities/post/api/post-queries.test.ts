import { describe, expect, it } from "vitest";
import { commentsFixture } from "@/shared/api/mocks/fixtures";
import { CommentsSchema, postKeys, postQueries } from "./post-queries";

describe("postKeys", () => {
  it("builds a hierarchical list key", () => expect(postKeys.list()).toEqual(["posts", "list"]));
  it("builds a hierarchical detail key", () =>
    expect(postKeys.detail("1")).toEqual(["posts", "detail", "1"]));
  it("nests the comments key under the detail key", () =>
    expect(postKeys.comments("1")).toEqual([...postKeys.detail("1"), "comments"]));
  it("prefixes detail and comments keys with details()", () => {
    expect(postKeys.detail("1").slice(0, 2)).toEqual([...postKeys.details()]);
    expect(postKeys.comments("1").slice(0, 2)).toEqual([...postKeys.details()]);
  });
});

describe("postQueries", () => {
  it("reuses the key factories", () => {
    expect(postQueries.detail("7").queryKey).toEqual(postKeys.detail("7"));
    expect(postQueries.comments("7").queryKey).toEqual(postKeys.comments("7"));
  });
});

describe("commentsFixture (pinned A12 contract)", () => {
  it("conforms to the Comment schema", () => {
    expect(() => CommentsSchema.parse(commentsFixture)).not.toThrow();
  });
  it("has exactly 10 comments for post 1, sorted by `at` descending", () => {
    expect(commentsFixture).toHaveLength(10);
    for (const comment of commentsFixture) expect(comment.postId).toBe("1");
    const stamps = commentsFixture.map((c) => Date.parse(c.at));
    expect(stamps).toEqual([...stamps].sort((a, b) => b - a));
    expect(new Set(stamps).size).toBe(stamps.length);
  });
});
