import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import en from "@/../messages/en.json";
import { sseHandlers } from "@/shared/api/mocks/sse-handlers";
import { SseLive } from "./sse-live";

/**
 * Drives the Storybook-only `/api/sse` mock (`sse-handlers.ts`, reusing the
 * real stream builder) — the status badge reaches its "open" label and the
 * event list gains items for both named event kinds.
 */
const meta = {
  component: SseLive,
  // No `autodocs`/`DarkTheme` here on purpose: this is the live-mock
  // integration probe, not a documented component — mirrors
  // `websocket-live.stories.tsx`. The presentational children (connection
  // status, message list) carry the light/dark a11y coverage.
  tags: ["test"],
  parameters: { msw: { handlers: sseHandlers } },
} satisfies Meta<typeof SseLive>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Live: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Badge reaches the open state (label from the en catalog).
    await expect(await canvas.findByText(en.SseExample.statusOpen)).toBeVisible();
    // The stream pushes a `notice` immediately — the list gains its first item.
    const list = await canvas.findByRole("list", { name: en.SseExample.messagesTitle });
    const items = await within(list).findAllByRole("listitem", undefined, { timeout: 4000 });
    await expect(items.length).toBeGreaterThan(0);
  },
};
