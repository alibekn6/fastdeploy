import { HTTPError } from "ky";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { getValidated } from "@/shared/api/fetcher";
import { commentsFixture, postsFixture } from "@/shared/api/mocks/fixtures";
import { handlers } from "@/shared/api/mocks/handlers";
import { COMMENTS_FAILURE_HEADER } from "@/shared/api/mocks/mock-control";
import { CommentsSchema, PostSchema } from "./post-queries";

// The real shared handlers array — the same one both runtimes register — so
// these tests prove the ky client and the MSW URL patterns actually match.
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("GET posts/:id", () => {
  it("serves the fixture post", async () => {
    await expect(getValidated("posts/1", PostSchema)).resolves.toEqual(postsFixture[0]);
  });
  it("responds 404 for an unknown id (bare status, no envelope)", async () => {
    const request = getValidated("posts/999", PostSchema);
    await expect(request).rejects.toBeInstanceOf(HTTPError);
    await request.catch((error: HTTPError) => expect(error.response.status).toBe(404));
  });
});

describe("GET posts/:id/comments", () => {
  it("serves the pinned fixture verbatim, in export order, as a flat array", async () => {
    const comments = await getValidated("posts/1/comments", CommentsSchema);
    expect(comments).toEqual(commentsFixture);
  });
  it("responds 404 for an unknown post id", async () => {
    const request = getValidated("posts/999/comments", CommentsSchema);
    await expect(request).rejects.toBeInstanceOf(HTTPError);
    await request.catch((error: HTTPError) => expect(error.response.status).toBe(404));
  });
});

describe("comments failure injection (per-request, e2e seam)", () => {
  it("fails only the request carrying the failure header", async () => {
    const failing = getValidated("posts/1/comments", CommentsSchema, {
      retry: 0,
      headers: { [COMMENTS_FAILURE_HEADER]: "500" },
    });
    await expect(failing).rejects.toBeInstanceOf(HTTPError);
    await failing.catch((error: HTTPError) => expect(error.response.status).toBe(500));

    await expect(getValidated("posts/1/comments", CommentsSchema)).resolves.toEqual(
      commentsFixture,
    );
  });

  it("leaves a CONCURRENT request without the header untouched (no shared process state)", async () => {
    const failing = getValidated("posts/1/comments", CommentsSchema, {
      retry: 0,
      headers: { [COMMENTS_FAILURE_HEADER]: "503" },
    }).catch((error: HTTPError) => error.response.status);
    const healthy = getValidated("posts/1/comments", CommentsSchema);

    expect(await failing).toBe(503);
    expect(await healthy).toEqual(commentsFixture);
  });
});
