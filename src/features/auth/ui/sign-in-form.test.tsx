import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "@/../messages/en.json";

vi.mock("../api/sign-in", () => ({ signIn: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/login",
}));

import { SignInForm } from "./sign-in-form";

describe("SignInForm", () => {
  it("shows localized validation errors on empty submit", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <QueryClientProvider client={new QueryClient()}>
          <SignInForm />
        </QueryClientProvider>
      </NextIntlClientProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: en.Auth.submit }));
    expect(await screen.findByText(en.Auth.emailInvalid)).toBeInTheDocument();
    expect(screen.getByText(en.Auth.passwordRequired)).toBeInTheDocument();
  });
});
