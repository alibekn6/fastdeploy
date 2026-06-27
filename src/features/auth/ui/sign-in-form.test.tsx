import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "@/../messages/en.json";

vi.mock("../api/sign-in", () => ({ signIn: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { SignInForm } from "./sign-in-form";

describe("SignInForm", () => {
  it("shows validation errors on empty submit", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SignInForm />
      </NextIntlClientProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
  });
});
