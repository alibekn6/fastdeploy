import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { delay, HttpResponse, http } from "msw";
import { expect, userEvent, within } from "storybook/test";
import en from "@/../messages/en.json";
import { apiUrl } from "@/shared/api/mocks/api-url";
import { Header } from "./header";

/**
 * The header's three session states all come from `GET auth/me` at the network
 * boundary — the widget reads the session query, so the stories drive the query.
 */
const meta = {
  component: Header,
  tags: ["autodocs", "test"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

const SIGNED_IN_EMAIL = "ada@example.com";

const meAuthenticated = http.get(apiUrl("/auth/me"), () =>
  HttpResponse.json({
    data: { id: "u1", email: SIGNED_IN_EMAIL, name: "ada", is_active: true },
  }),
);

const meAnonymous = http.get(apiUrl("/auth/me"), () =>
  HttpResponse.json({ error: { code: "unauthorized", message: "unauthorized" } }, { status: 401 }),
);

/** Session query still pending: the fixed-height skeleton holds the layout. */
export const Loading: Story = {
  parameters: { msw: { handlers: [http.get(apiUrl("/auth/me"), () => delay("infinite"))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId("session-skeleton")).toBeInTheDocument();
  },
};

export const SignedIn: Story = {
  parameters: { msw: { handlers: [meAuthenticated] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId("user-email")).toHaveTextContent(SIGNED_IN_EMAIL);
    await expect(canvas.getByRole("button", { name: en.Common.signOut })).toBeEnabled();
  },
};

export const SignedOut: Story = {
  parameters: { msw: { handlers: [meAnonymous] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("link", { name: en.Common.signIn })).toBeVisible();
  },
};

/**
 * Logout failed at the network seam. Local state was deliberately NOT cleared,
 * so the header honestly stays signed in and announces the failure for a retry.
 */
export const SignOutFailure: Story = {
  parameters: {
    msw: {
      handlers: [
        meAuthenticated,
        http.post(apiUrl("/auth/logout"), () =>
          HttpResponse.json({ error: { code: "internal", message: "internal" } }, { status: 500 }),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: en.Common.signOut }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(en.Auth.serverError);
    // Still signed in — the header must not lie about a failed sign-out.
    await expect(canvas.getByTestId("user-email")).toHaveTextContent(SIGNED_IN_EMAIL);
  },
};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = {
  parameters: { theme: "dark", msw: { handlers: [meAuthenticated] } },
};
