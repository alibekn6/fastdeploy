import { expect, test } from "@playwright/test";
import en from "../messages/en.json";
import { commentsFixture, postsFixture } from "../src/shared/api/mocks/fixtures";
import { MOCK_COMMENTS_FAILURE_COOKIE } from "../src/shared/api/mocks/mock-control";

const BASE = `http://localhost:${process.env.PORT ?? 3000}`;

const [post] = postsFixture;
const [firstComment] = commentsFixture;
if (!post || !firstComment) throw new Error("mock fixtures must not be empty");

/**
 * MSW failure injection (mock mode only, see src/shared/api/mocks/mock-control.ts).
 * BOTH signals are scoped to THIS test's browser context, never to the shared
 * dev-server process, so the suite stays safe under `fullyParallel` workers:
 * - server runtime (SSR prefetch): the MOCK_COMMENTS_FAILURE_COOKIE cookie,
 *   which node.ts reads off the current Next request;
 * - browser runtime (client refetch): `globalThis.__mswCommentsFailure`,
 *   injected per navigation via addInitScript.
 */

function metaContent(html: string, property: string): string {
  const tag = html.match(new RegExp(`<meta[^>]*property="${property}"[^>]*>`))?.[0] ?? "";
  return /content="([^"]*)"/.exec(tag)?.[1] ?? "";
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("SSR streaming example", () => {
  test("A11: served HTML carries the post title in <title>, og:title and og:description", async ({
    request,
  }) => {
    const response = await request.get("/examples/ssr/1");
    expect(response.ok()).toBeTruthy();
    const html = await response.text();
    expect(html).toMatch(new RegExp(`<title>[^<]*${escapeRegExp(post.title)}[^<]*</title>`));
    expect(metaContent(html, "og:title")).toContain(post.title);
    expect(metaContent(html, "og:description")).toContain(post.title);
  });

  test("A11: the post is visible before the comments, then the comments stream in", async ({
    page,
  }) => {
    // Warm-up visit so dev-server compilation doesn't skew the streaming window.
    await page.goto("/examples/ssr/1");
    await expect(page.getByText(firstComment.body)).toBeVisible({ timeout: 30_000 });

    await page.goto("/examples/ssr/1", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: post.title, level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(firstComment.body)).toBeHidden();
    // Generous ceiling, not a streaming assertion: the hidden-then-visible
    // ORDER above is what proves streaming. Parallel workers sharing one dev
    // server can starve this window well past 15 s.
    await expect(page.getByText(firstComment.body)).toBeVisible({ timeout: 30_000 });
  });

  test("A12: an unknown id responds 404 and renders the localized not-found UI", async ({
    page,
  }) => {
    const response = await page.goto("/examples/ssr/999");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: en.SsrExample.notFoundTitle })).toBeVisible();
  });

  test("A12: a comments 5xx shows the error boundary; retry after lifting the override renders the comments in fixture order", async ({
    context,
    page,
  }) => {
    await page.addInitScript(() => {
      globalThis.__mswCommentsFailure = 500;
    });
    await context.addCookies([{ name: MOCK_COMMENTS_FAILURE_COOKIE, value: "500", url: BASE }]);

    await page.goto("/examples/ssr/1");
    const fallback = page.getByTestId("error-boundary-fallback");
    await expect(fallback).toBeVisible({ timeout: 30_000 });
    const retry = fallback.getByRole("button", { name: en.Error.retry });
    await expect(retry).toBeVisible();

    await context.clearCookies({ name: MOCK_COMMENTS_FAILURE_COOKIE });
    await page.evaluate(() => {
      globalThis.__mswCommentsFailure = null;
    });
    await retry.click();

    const items = page
      .getByRole("list", { name: en.SsrExample.commentsTitle })
      .getByRole("listitem");
    await expect(items).toHaveText(
      commentsFixture.map((comment) => new RegExp(escapeRegExp(comment.body))),
      // Same rationale as A11: the recovery is what matters, not its latency.
      { timeout: 30_000 },
    );
  });
});
