import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { delay, HttpResponse, http } from "msw";
import { expect, userEvent, waitFor, within } from "storybook/test";
import en from "@/../messages/en.json";
import { apiUrl } from "@/shared/api/mocks/api-url";
import { SignUpForm } from "./sign-up-form";

/**
 * Sign-up state matrix. The 409 and 500 variants below are the A4 probe: an
 * already-registered email must NOT collapse into the generic failure message.
 */
const meta = {
  component: SignUpForm,
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof SignUpForm>;

export default meta;

type Story = StoryObj<typeof meta>;

const VALID_PASSWORD = "correct-horse-battery-staple";

const registerError = (status: number, code: string) =>
  http.post(apiUrl("/auth/register"), () =>
    HttpResponse.json({ error: { code, message: code } }, { status }),
  );

async function submitSignUp(canvas: ReturnType<typeof within>, password = VALID_PASSWORD) {
  await userEvent.type(canvas.getByLabelText(en.Auth.email), "ada@example.com");
  await userEvent.type(canvas.getByLabelText(en.Auth.password), password);
  await userEvent.type(canvas.getByLabelText(en.Auth.confirmPassword), password);
  await userEvent.click(canvas.getByRole("button", { name: en.Auth.signUpSubmit }));
}

export const Default: Story = {};

/** Same story under the dark class — a11y (`test: "error"`) runs on both themes. */
export const DarkTheme: Story = { parameters: { theme: "dark" } };

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: en.Auth.signUpSubmit }));

    await expect(await canvas.findByText(en.Auth.emailInvalid)).toBeVisible();
    await expect(await canvas.findByText(en.Auth.passwordTooShort)).toBeVisible();
  },
};

export const PasswordMismatch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(en.Auth.email), "ada@example.com");
    await userEvent.type(canvas.getByLabelText(en.Auth.password), VALID_PASSWORD);
    await userEvent.type(canvas.getByLabelText(en.Auth.confirmPassword), "something-else-entirely");
    await userEvent.click(canvas.getByRole("button", { name: en.Auth.signUpSubmit }));

    await expect(await canvas.findByText(en.Auth.passwordMismatch)).toBeVisible();
  },
};

export const Submitting: Story = {
  parameters: {
    msw: { handlers: [http.post(apiUrl("/auth/register"), () => delay("infinite"))] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitSignUp(canvas);

    await waitFor(() =>
      expect(canvas.getByRole("button", { name: en.Auth.signUpSubmit })).toBeDisabled(),
    );
  },
};

/**
 * A4 probe, half one: a 409 renders the email-taken message from the catalog —
 * distinct from the generic server error (a documented enumeration tradeoff).
 */
export const EmailTakenError: Story = {
  parameters: { msw: { handlers: [registerError(409, "email_taken")] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitSignUp(canvas);

    await expect(await canvas.findByRole("alert")).toHaveTextContent(en.Auth.emailTaken);
    // The two variants must stay distinguishable to the user.
    await expect(en.Auth.emailTaken).not.toBe(en.Auth.serverError);
  },
};

/** A4 probe, half two: any other failure renders the generic catalog message. */
export const ServerError: Story = {
  parameters: { msw: { handlers: [registerError(500, "internal_error")] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitSignUp(canvas);

    await expect(await canvas.findByRole("alert")).toHaveTextContent(en.Auth.serverError);
    await expect(en.Auth.serverError).not.toBe(en.Auth.emailTaken);
  },
};
