import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { delay, HttpResponse, http } from "msw";
import { expect, spyOn, userEvent, waitFor, within } from "storybook/test";
import en from "@/../messages/en.json";
import { apiUrl } from "@/shared/api/mocks/api-url";
import { SignInForm } from "./sign-in-form";

/**
 * Sign-in state matrix. Every server variant comes from a per-story MSW
 * override at the network boundary — the component is never handed fake props.
 */
const meta = {
  component: SignInForm,
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof SignInForm>;

export default meta;

type Story = StoryObj<typeof meta>;

const loginError = (status: number, code: string) =>
  http.post(apiUrl("/auth/login"), () =>
    HttpResponse.json({ error: { code, message: code } }, { status }),
  );

async function fillCredentials(canvas: ReturnType<typeof within>, password: string) {
  await userEvent.type(canvas.getByLabelText(en.Auth.email), "ada@example.com");
  await userEvent.type(canvas.getByLabelText(en.Auth.password), password);
  await userEvent.click(canvas.getByRole("button", { name: en.Auth.submit }));
}

export const Default: Story = {};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = { parameters: { theme: "dark" } };

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: en.Auth.submit }));

    await expect(await canvas.findByText(en.Auth.emailInvalid)).toBeVisible();
    await expect(await canvas.findByText(en.Auth.passwordRequired)).toBeVisible();
  },
};

/** Submit stays disabled while the request is in flight (no double-submit). */
export const Submitting: Story = {
  parameters: {
    msw: { handlers: [http.post(apiUrl("/auth/login"), () => delay("infinite"))] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillCredentials(canvas, "correct-horse-battery");

    await waitFor(() =>
      expect(canvas.getByRole("button", { name: en.Auth.submit })).toBeDisabled(),
    );
  },
};

/**
 * A2 story probe. A rejected sign-in is an expected outcome, not a crash: the
 * play function watches `console.error` and unhandled `window` errors across
 * the WHOLE interaction and asserts both stayed silent while the alert rendered.
 */
export const ServerError: Story = {
  parameters: { msw: { handlers: [loginError(401, "invalid_credentials")] } },
  play: async ({ canvasElement }) => {
    // `spyOn` from `storybook/test` IS vitest's `spyOn`, re-exported so the
    // story also runs in the Storybook UI (where no `vi` global exists).
    const consoleError = spyOn(console, "error");
    const windowErrors: ErrorEvent[] = [];
    const captureWindowError = (event: ErrorEvent) => windowErrors.push(event);
    window.addEventListener("error", captureWindowError);

    try {
      const canvas = within(canvasElement);
      await fillCredentials(canvas, "wrong-password-here");

      await expect(await canvas.findByRole("alert")).toHaveTextContent(en.Auth.invalidCredentials);

      await expect(consoleError).not.toHaveBeenCalled();
      await expect(windowErrors).toHaveLength(0);
    } finally {
      window.removeEventListener("error", captureWindowError);
      consoleError.mockRestore();
    }
  },
};

export const RateLimited: Story = {
  parameters: { msw: { handlers: [loginError(429, "too_many_attempts")] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillCredentials(canvas, "correct-horse-battery");

    await expect(await canvas.findByRole("alert")).toHaveTextContent(en.Auth.tooManyAttempts);
  },
};
