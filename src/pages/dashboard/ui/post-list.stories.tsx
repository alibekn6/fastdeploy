import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { delay, HttpResponse, http } from "msw";
import { expect, within } from "storybook/test";
import { apiUrl } from "@/shared/api/mocks/api-url";
import { postsFixture } from "@/shared/api/mocks/fixtures";
import { PostList } from "./post-list";

/**
 * `PostList` is query-driven — every story shapes `GET posts` at the network
 * boundary rather than handing the component a prop.
 */
const meta = {
  component: PostList,
  tags: ["autodocs", "test"],
} satisfies Meta<typeof PostList>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The shipped fixture, served by the app's own handler. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = postsFixture[0];
    if (!first) throw new Error("postsFixture must contain at least one post");
    await expect(await canvas.findByText(first.title)).toBeVisible();
  },
};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = { parameters: { theme: "dark" } };

/** A longer list exercises the vertical rhythm between cards. */
export const ManyPosts: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(apiUrl("/posts"), () =>
          HttpResponse.json(
            Array.from({ length: 6 }, (_, index) => ({
              id: String(index + 1),
              title: `Post ${index + 1}`,
              body: "A short body that shows how a card wraps across the available width.",
            })),
          ),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findAllByRole("listitem")).toHaveLength(6);
  },
};

export const Empty: Story = {
  parameters: {
    msw: { handlers: [http.get(apiUrl("/posts"), () => HttpResponse.json([]))] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryAllByRole("listitem")).toHaveLength(0);
  },
};

export const Loading: Story = {
  parameters: {
    msw: { handlers: [http.get(apiUrl("/posts"), () => delay("infinite"))] },
  },
};
