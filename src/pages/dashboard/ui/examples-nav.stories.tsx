import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import en from "@/../messages/en.json";
import { ExamplesNav } from "./examples-nav";

/**
 * Static, translation-driven links to every `/examples/*` route — no network
 * boundary to mock, unlike the query-driven `PostList`.
 */
const meta = {
  component: ExamplesNav,
  tags: ["autodocs", "test"],
} satisfies Meta<typeof ExamplesNav>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nav = canvas.getByRole("navigation", { name: en.Dashboard.examplesHeading });

    const links = within(nav).getAllByRole("link");
    await expect(links).toHaveLength(3);
    await expect(within(nav).getByRole("link", { name: /Streaming SSR/ })).toHaveAttribute(
      "href",
      "/examples/ssr/1",
    );
    await expect(within(nav).getByRole("link", { name: /WebSocket/ })).toHaveAttribute(
      "href",
      "/examples/websocket",
    );
    await expect(within(nav).getByRole("link", { name: /Server-Sent Events/ })).toHaveAttribute(
      "href",
      "/examples/sse",
    );
  },
};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = { ...Default, parameters: { theme: "dark" } };
