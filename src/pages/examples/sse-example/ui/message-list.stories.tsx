import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import en from "@/../messages/en.json";
import type { SseEventMessage } from "@/shared/api/sse-schema";
import { MessageList } from "./message-list";

/**
 * Presentational list over the hook's accumulated frames — both named events
 * (`notice`, `update`) the real `/api/sse` route emits.
 */
const meta = {
  component: MessageList,
  tags: ["autodocs", "test"],
} satisfies Meta<typeof MessageList>;

export default meta;

type Story = StoryObj<typeof meta>;

const notice = (id: number, minute: number): SseEventMessage => ({
  type: "notice",
  id: String(id),
  text: "Connected to the SSE demo stream",
  at: `2026-07-17T09:${String(minute).padStart(2, "0")}:00.000Z`,
});

const update = (id: number, minute: number): SseEventMessage => ({
  type: "update",
  id: String(id),
  text: `Live update #${id}`,
  at: `2026-07-17T09:${String(minute).padStart(2, "0")}:00.000Z`,
});

/** Before the first event arrives — the honest waiting state, not a blank box. */
export const Empty: Story = {
  args: { messages: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(en.SseExample.empty)).toBeVisible();
  },
};

export const SingleEvent: Story = { args: { messages: [notice(1, 0)] } };

/** Both named event kinds rendered together, distinguished by their type label. */
export const Streaming: Story = {
  args: { messages: [notice(1, 0), update(2, 1), update(3, 2), update(4, 3), update(5, 4)] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole("list", { name: en.SseExample.messagesTitle });
    const items = within(list).getAllByRole("listitem");

    await expect(items).toHaveLength(5);
    await expect(items[0]).toHaveTextContent(en.SseExample.eventTypeNotice);
    await expect(items[1]).toHaveTextContent(en.SseExample.eventTypeUpdate);
  },
};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = {
  ...Streaming,
  parameters: { theme: "dark" },
};
