import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const meta = {
  component: Label,
  tags: ["autodocs", "test"],
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

// Labels are only meaningful when associated with a control, so the story
// pairs the Label with an Input via htmlFor/id (keeps it a11y-clean).
export const Default: Story = {
  render: () => (
    <div className="grid w-72 gap-2">
      <Label htmlFor="username">Username</Label>
      <Input id="username" placeholder="ada-lovelace" />
    </div>
  ),
};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = { ...Default, parameters: { theme: "dark" } };
