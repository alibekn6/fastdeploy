import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import en from "@/../messages/en.json";
import type { SseStatus } from "@/shared/api/sse";
import { ConnectionStatus } from "./connection-status";

/**
 * Presentational badge over the hook's `SseStatus` union — the status is the
 * component's only input, so the stories enumerate the union exhaustively.
 */
const meta = {
  component: ConnectionStatus,
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof ConnectionStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

const ALL_STATUSES: SseStatus[] = ["connecting", "open", "reconnecting", "closed"];

export const Connecting: Story = { args: { status: "connecting" } };

export const Open: Story = {
  args: { status: "open" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The dot is decorative; the localized label is what carries the state.
    await expect(canvas.getByRole("status")).toHaveTextContent(en.SseExample.statusOpen);
  },
};

export const Reconnecting: Story = { args: { status: "reconnecting" } };

export const Closed: Story = { args: { status: "closed" } };

/** All four side by side — the state matrix reviewers actually look at. */
export const AllStates: Story = {
  args: { status: "open" },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {ALL_STATUSES.map((status) => (
        <ConnectionStatus key={status} status={status} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("status")).toHaveLength(ALL_STATUSES.length);
  },
};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = {
  ...AllStates,
  parameters: { theme: "dark" },
};
