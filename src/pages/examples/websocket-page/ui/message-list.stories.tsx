import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import en from "@/../messages/en.json";
import type { WsMessage } from "@/shared/api/websocket";
import { MessageList } from "./message-list";

/**
 * Presentational list over the hook's accumulated frames. Frame shape and text
 * mirror what `ws-handlers.ts` pushes (`Live update #N`, one per second) — the
 * end-to-end path through the real `ws.link()` mock is covered separately by
 * `websocket-live.stories.tsx`.
 */
const meta = {
  component: MessageList,
  tags: ["autodocs", "test"],
} satisfies Meta<typeof MessageList>;

export default meta;

type Story = StoryObj<typeof meta>;

const message = (id: number, minute: number): WsMessage => ({
  type: "message",
  id: String(id),
  text: `Live update #${id}`,
  at: `2026-07-17T09:${String(minute).padStart(2, "0")}:00.000Z`,
});

/** Before the first frame arrives — the honest waiting state, not a blank box. */
export const Empty: Story = {
  args: { messages: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(en.WsExample.empty)).toBeVisible();
  },
};

export const SingleMessage: Story = { args: { messages: [message(1, 0)] } };

export const Streaming: Story = {
  args: { messages: [1, 2, 3, 4, 5].map((id) => message(id, id)) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole("list", { name: en.WsExample.messagesTitle });

    await expect(within(list).getAllByRole("listitem")).toHaveLength(5);
  },
};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = {
  ...Streaming,
  parameters: { theme: "dark" },
};
