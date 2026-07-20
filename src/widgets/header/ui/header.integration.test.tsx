// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { NextIntlClientProvider } from "next-intl";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/../messages/en.json";
import { handlers } from "@/shared/api/mocks/handlers";
import { Header } from "./header";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

// MSW at the network boundary: the real shared handlers, per-test overrides.
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

const authError = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message } }, { status });

function renderHeader() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <QueryClientProvider client={new QueryClient()}>
        <Header />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

// A9 header-state probes — one assertion each: the header honestly reflects
// session state at all times (pending / authenticated / anonymous).
describe("Header session slot", () => {
  it("renders the session skeleton while auth/me is pending", async () => {
    server.use(
      http.get("*/auth/me", async () => {
        await delay(150);
        return authError(401, "unauthorized", "Not authenticated");
      }),
    );
    renderHeader();

    expect(screen.getByTestId("session-skeleton")).toBeInTheDocument();
  });

  it("renders the user's email once auth/me resolves authenticated", async () => {
    server.use(
      http.get("*/auth/me", () =>
        HttpResponse.json({
          data: { id: "u1", email: "user@example.com", name: "user", is_active: true },
        }),
      ),
    );
    renderHeader();

    expect(await screen.findByTestId("user-email")).toHaveTextContent("user@example.com");
  });

  it("renders the localized sign-in link when auth/me 401s (anonymous session)", async () => {
    server.use(http.get("*/auth/me", () => authError(401, "unauthorized", "Not authenticated")));
    renderHeader();

    expect(await screen.findByRole("link", { name: en.Common.signIn })).toBeInTheDocument();
  });

  it("keeps the signed-in state and shows a localized error when auth/logout fails", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/auth/me", () =>
        HttpResponse.json({
          data: { id: "u1", email: "user@example.com", name: "user", is_active: true },
        }),
      ),
      http.post("*/auth/logout", () => authError(500, "server_error", "Boom")),
    );
    renderHeader();
    await user.click(await screen.findByRole("button", { name: en.Common.signOut }));

    // Honest failure: still signed in (email + button intact), error announced.
    expect(await screen.findByRole("alert")).toHaveTextContent(en.Auth.serverError);
    expect(screen.getByTestId("user-email")).toHaveTextContent("user@example.com");
  });
});
