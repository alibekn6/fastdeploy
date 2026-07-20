import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import en from "@/../messages/en.json";
import { ConsentBanner } from "./consent-banner";

/**
 * The banner renders only while analytics is configured AND no choice has been
 * stored, so every story starts from a cleared decision. `NEXT_PUBLIC_POSTHOG_KEY`
 * is supplied by the `storybook`/`build-storybook`/`test-storybook` scripts —
 * without it the component is a deliberate no-op and there is nothing to show.
 */
const meta = {
  component: ConsentBanner,
  tags: ["autodocs", "test"],
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    window.localStorage.removeItem("ph_consent_decided");
  },
} satisfies Meta<typeof ConsentBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("dialog", { name: en.Consent.label })).toBeVisible();
    await expect(canvas.getByText(en.Consent.message)).toBeVisible();
  },
};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = { parameters: { theme: "dark" } };

export const Accepted: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: en.Consent.accept }));

    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
  },
};

export const Rejected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: en.Consent.reject }));

    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
  },
};
