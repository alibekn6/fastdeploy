import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import en from "@/../messages/en.json";
import type { WsStatus } from "@/shared/api/websocket";
import { ConnectionStatus } from "./connection-status";

/**
 * Presentational badge over the hook's `WsStatus` union — the status is the
 * component's only input, so the stories enumerate the union exhaustively.
 */
const meta = {
  component: ConnectionStatus,
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof ConnectionStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

const ALL_STATUSES: WsStatus[] = ["connecting", "connected", "reconnecting", "disconnected"];

export const Connecting: Story = { args: { status: "connecting" } };

export const Connected: Story = {
  args: { status: "connected" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The dot is decorative; the localized label is what carries the state.
    await expect(canvas.getByRole("status")).toHaveTextContent(en.WsExample.statusConnected);
  },
};

export const Reconnecting: Story = { args: { status: "reconnecting" } };

export const Disconnected: Story = { args: { status: "disconnected" } };

/** All four side by side — the state matrix reviewers actually look at. */
export const AllStates: Story = {
  args: { status: "connected" },
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
