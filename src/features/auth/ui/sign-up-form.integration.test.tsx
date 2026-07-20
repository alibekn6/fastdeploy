// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { NextIntlClientProvider } from "next-intl";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/../messages/en.json";
import { handlers } from "@/shared/api/mocks/handlers";
import { SignUpForm } from "./sign-up-form";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
  usePathname: () => "/signup",
}));

// MSW at the network boundary: the real shared handlers, per-test error overrides.
const server = setupServer(...handlers);
const requestedPaths: string[] = [];
server.events.on("request:start", ({ request }) => {
  requestedPaths.push(new URL(request.url).pathname);
});

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  push.mockClear();
  requestedPaths.length = 0;
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

function renderForm() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <QueryClientProvider client={new QueryClient()}>
        <SignUpForm />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

const PASSWORD = "a-long-enough-password";

async function submitWith(email: string, password = PASSWORD, confirmation = password) {
  await userEvent.type(screen.getByLabelText(en.Auth.email), email);
  await userEvent.type(screen.getByLabelText(en.Auth.password), password);
  await userEvent.type(screen.getByLabelText(en.Auth.confirmPassword), confirmation);
  await userEvent.click(screen.getByRole("button", { name: en.Auth.signUpSubmit }));
}

describe("SignUpForm (A4 — server errors)", () => {
  it("renders the catalog email-taken message on the deterministic 409, distinct from the 500 text", async () => {
    // The shared handler 409s deterministically for taken@example.com — no override.
    renderForm();
    await submitWith("taken@example.com");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(en.Auth.emailTaken);
    expect(alert.textContent).not.toBe(en.Auth.serverError);
    expect(push).not.toHaveBeenCalled();
  });

  it("renders the localized generic message on a 500 override", async () => {
    server.use(http.post("*/auth/register", () => HttpResponse.json(null, { status: 500 })));
    renderForm();
    await submitWith("fresh@example.com");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(en.Auth.serverError);
  });

  it("renders the localized too-many-attempts message on a 429 override", async () => {
    server.use(
      http.post("*/auth/register", () =>
        HttpResponse.json(
          { error: { code: "rate_limited", message: "Too many attempts" } },
          { status: 429 },
        ),
      ),
    );
    renderForm();
    await submitWith("fresh@example.com");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(en.Auth.tooManyAttempts);
  });
});

describe("SignUpForm (state matrix)", () => {
  it("loading: disables the submit button until the register response resolves", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post("*/auth/register", async () => {
        await gate;
        await delay(0);
        return HttpResponse.json({ data: { message: "Registered" } });
      }),
    );
    renderForm();
    await submitWith("fresh@example.com");

    const submit = screen.getByRole("button", { name: en.Auth.signUpSubmit });
    expect(submit).toBeDisabled();
    release();
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(submit).not.toBeDisabled();
  });

  it("success: pushes the dashboard route exactly once, after register → me at the mock boundary", async () => {
    renderForm();
    await submitWith("fresh@example.com");

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push.mock.calls[0]?.[0]).toBe("/dashboard");
    // A3: the register → me call SEQUENCE, ordered, at the MSW boundary.
    expect(requestedPaths.filter((p) => p.startsWith("/auth/"))).toEqual([
      "/auth/register",
      "/auth/me",
    ]);
  });

  it("validation: an 11-char password renders its localized error with zero network calls", async () => {
    renderForm();
    await submitWith("fresh@example.com", "a".repeat(11));

    expect(await screen.findByText(en.Auth.passwordTooShort)).toBeInTheDocument();
    expect(requestedPaths).toEqual([]);
    expect(push).not.toHaveBeenCalled();
  });

  it("validation: a 129-char password renders its localized error with zero network calls", async () => {
    renderForm();
    await submitWith("fresh@example.com", "a".repeat(129));

    expect(await screen.findByText(en.Auth.passwordTooLong)).toBeInTheDocument();
    expect(requestedPaths).toEqual([]);
    expect(push).not.toHaveBeenCalled();
  });

  it("validation: a mismatched confirmation renders its localized error with zero network calls", async () => {
    renderForm();
    await submitWith("fresh@example.com", PASSWORD, `${PASSWORD}-nope`);

    expect(await screen.findByText(en.Auth.passwordMismatch)).toBeInTheDocument();
    expect(requestedPaths).toEqual([]);
    expect(push).not.toHaveBeenCalled();
  });
});
