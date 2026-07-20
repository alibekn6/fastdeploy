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
import { SignInForm } from "./sign-in-form";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
  usePathname: () => "/login",
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
        <SignInForm />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

async function submitValidCredentials() {
  await userEvent.type(screen.getByLabelText(en.Auth.email), "user@example.com");
  await userEvent.type(screen.getByLabelText(en.Auth.password), "password123");
  await userEvent.click(screen.getByRole("button", { name: en.Auth.submit }));
}

describe("SignInForm (A2 — wrong credentials)", () => {
  it("renders the localized invalid_credentials message with no error boundary and no redirect", async () => {
    server.use(
      http.post("*/auth/login", () =>
        HttpResponse.json(
          { error: { code: "invalid_credentials", message: "Invalid credentials" } },
          { status: 401 },
        ),
      ),
    );
    renderForm();
    await submitValidCredentials();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(en.Auth.invalidCredentials);
    expect(screen.queryByTestId("error-boundary-fallback")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("renders the localized too-many-attempts message on a 429 override", async () => {
    server.use(
      http.post("*/auth/login", () =>
        HttpResponse.json(
          { error: { code: "rate_limited", message: "Too many attempts" } },
          { status: 429 },
        ),
      ),
    );
    renderForm();
    await submitValidCredentials();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(en.Auth.tooManyAttempts);
  });

  it("renders the localized generic message on a 500 override", async () => {
    server.use(http.post("*/auth/login", () => HttpResponse.json(null, { status: 500 })));
    renderForm();
    await submitValidCredentials();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(en.Auth.serverError);
  });
});

describe("SignInForm (state matrix)", () => {
  it("loading: disables the submit button until the login response resolves", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post("*/auth/login", async () => {
        await gate;
        await delay(0);
        return HttpResponse.json({ data: { message: "Signed in" } });
      }),
    );
    renderForm();
    await submitValidCredentials();

    const submit = screen.getByRole("button", { name: en.Auth.submit });
    expect(submit).toBeDisabled();
    release();
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(submit).not.toBeDisabled();
  });

  it("success: pushes the dashboard route exactly once, after login → me at the mock boundary", async () => {
    renderForm();
    await submitValidCredentials();

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push.mock.calls[0]?.[0]).toBe("/dashboard");
    // No cookie jar in jsdom, so the `me` probe 401s and spends its ONE quiet
    // `auth/refresh` disambiguation (stale-access vs. anonymous) before settling
    // on `anonymousSession`. Bounded: never a second refresh, never a redirect.
    expect(requestedPaths.filter((p) => p.startsWith("/auth/"))).toEqual([
      "/auth/login",
      "/auth/me",
      "/auth/refresh",
    ]);
  });

  it("validation: empty submit renders localized field errors and makes zero network calls", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: en.Auth.submit }));

    expect(await screen.findByText(en.Auth.emailInvalid)).toBeInTheDocument();
    expect(screen.getByText(en.Auth.passwordRequired)).toBeInTheDocument();
    expect(requestedPaths).toEqual([]);
    expect(push).not.toHaveBeenCalled();
  });
});
