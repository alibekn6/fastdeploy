import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import { Suspense } from "react";
import { expect, within } from "storybook/test";
import en from "@/../messages/en.json";
import { apiUrl } from "@/shared/api/mocks/api-url";
import { commentsFixture } from "@/shared/api/mocks/fixtures";
import { CommentsList } from "./comments-list";

/**
 * `CommentsList` suspends, so every story supplies the boundary the SSR page
 * gives it in production. Data comes from `GET posts/:id/comments`.
 */
const meta = {
  component: CommentsList,
  tags: ["autodocs", "test"],
  args: { postId: "1" },
  render: (args) => (
    <Suspense fallback={<p>{en.SsrExample.commentsLoading}</p>}>
      <CommentsList {...args} />
    </Suspense>
  ),
} satisfies Meta<typeof CommentsList>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Resolved immediately so the loaded state is what the story shows. */
const immediateComments = http.get(apiUrl("/posts/:id/comments"), () =>
  HttpResponse.json(commentsFixture),
);

export const Default: Story = {
  parameters: { msw: { handlers: [immediateComments] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = await canvas.findByRole("list", { name: en.SsrExample.commentsTitle });
    const items = within(list).getAllByRole("listitem");

    await expect(items).toHaveLength(commentsFixture.length);
    // The server both selects and orders; the component must never re-sort.
    await expect(items.map((item) => item.textContent)).toEqual(
      commentsFixture.map((comment) => expect.stringContaining(comment.author)),
    );
  },
};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = {
  parameters: { theme: "dark", msw: { handlers: [immediateComments] } },
};

/**
 * The app's own 2 s-delayed handler: this is the state the nested Suspense
 * boundary shows on the real page while the rest of the HTML has streamed.
 */
export const Streaming: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(en.SsrExample.commentsLoading)).toBeVisible();

    await expect(
      await canvas.findByRole("list", { name: en.SsrExample.commentsTitle }, { timeout: 6000 }),
    ).toBeVisible();
  },
};

export const SingleComment: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(apiUrl("/posts/:id/comments"), () =>
          HttpResponse.json(commentsFixture.slice(0, 1)),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The count line is a plural-aware message — the singular branch matters.
    await expect(await canvas.findByText("1 comment")).toBeVisible();
  },
};
