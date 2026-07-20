import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import en from "@/../messages/en.json";
import { HomePage } from "./home-page";

const meta = {
  component: HomePage,
  tags: ["autodocs", "test"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HomePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: en.Common.appName })).toBeVisible();
    await expect(canvas.getByText(en.Home.tagline)).toBeVisible();
    await expect(canvas.getByRole("link", { name: en.Home.getStarted })).toBeVisible();
  },
};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = { parameters: { theme: "dark" } };
