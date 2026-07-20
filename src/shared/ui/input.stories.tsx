import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const meta = {
  component: Input,
  tags: ["autodocs", "test"],
  // a11y requires every input to have an accessible name, so each story
  // renders the Input with an associated Label via htmlFor/id.
  render: (args) => (
    <div className="grid w-72 gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" {...args} />
    </div>
  ),
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Typing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText<HTMLInputElement>("Email");

    await userEvent.type(input, "ada@example.com");

    await expect(input.value).toBe("ada@example.com");
  },
};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = { parameters: { theme: "dark" } };

/** Invalid state: the `aria-invalid` ring has its own `dark:` override. */
export const Invalid: Story = { args: { "aria-invalid": true } };
