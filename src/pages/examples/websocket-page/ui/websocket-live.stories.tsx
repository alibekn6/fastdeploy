import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import en from "@/../messages/en.json";
import { wsHandlers } from "@/shared/api/mocks/ws-handlers";
import { WebsocketLive } from "./websocket-live";

/**
 * A13: drives the browser-only `ws.link()` mock in the story context — the
 * status badge reaches its connected label (read from `messages/en.json`) and
 * the message list receives ≥1 mock-pushed item.
 */
const meta = {
  component: WebsocketLive,
  // No `autodocs`/`DarkTheme` here on purpose: this is the A13 live-mock
  // integration probe, not a documented component. The presentational children
  // it wraps (connection-status, message-list) carry the light/dark a11y
  // coverage for the UI this actually renders.
  tags: ["test"],
  parameters: { msw: { handlers: wsHandlers } },
} satisfies Meta<typeof WebsocketLive>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Live: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Badge reaches the connected state (label from the en catalog).
    await expect(await canvas.findByText(en.WsExample.statusConnected)).toBeVisible();
    // The mock pushes one message per second — the list gains ≥1 item.
    const list = await canvas.findByRole("list", { name: en.WsExample.messagesTitle });
    // The first push lands at ~1s — allow generous slack over the 1s interval.
    const items = await within(list).findAllByRole("listitem", undefined, { timeout: 4000 });
    await expect(items.length).toBeGreaterThan(0);
  },
};
