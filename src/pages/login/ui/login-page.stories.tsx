import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import { expect, userEvent, within } from "storybook/test";
import en from "@/../messages/en.json";
import { apiUrl } from "@/shared/api/mocks/api-url";
import { LoginPage } from "./login-page";

/** The full login screen: heading plus the sign-in feature in page context. */
const meta = {
  component: LoginPage,
  tags: ["autodocs", "test"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LoginPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: en.Auth.title })).toBeVisible();
    await expect(canvas.getByLabelText(en.Auth.email)).toBeVisible();
  },
};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = { parameters: { theme: "dark" } };

/** The failure path in page context: the alert sits inside the form column. */
export const RejectedCredentials: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(apiUrl("/auth/login"), () =>
          HttpResponse.json(
            { error: { code: "invalid_credentials", message: "invalid" } },
            { status: 401 },
          ),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(en.Auth.email), "ada@example.com");
    await userEvent.type(canvas.getByLabelText(en.Auth.password), "wrong-password-here");
    await userEvent.click(canvas.getByRole("button", { name: en.Auth.submit }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(en.Auth.invalidCredentials);
  },
};
