import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { postKeys } from "@/entities/post";
import en from "../../../../messages/en.json";
import { ErrorFallback } from "./error-fallback";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function setup() {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const reset = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <QueryClientProvider client={queryClient}>
        <ErrorFallback error={new Error("boom")} reset={reset} />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
  return { invalidate, reset };
}

describe("ErrorFallback", () => {
  it("carries the error-boundary testid and a retry button named from the catalog", () => {
    setup();
    expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.Error.retry })).toBeInTheDocument();
  });

  it("invalidates the post detail + comments keys BEFORE calling reset", async () => {
    const { invalidate, reset } = setup();
    await userEvent.click(screen.getByRole("button", { name: en.Error.retry }));
    // postKeys.details() prefixes every detail AND comments key, so one
    // invalidation covers both families TanStack cached the prefetch error under.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: postKeys.details() });
    expect(reset).toHaveBeenCalledTimes(1);
    const invalidateOrder = invalidate.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY;
    const resetOrder = reset.mock.invocationCallOrder[0] ?? 0;
    expect(invalidateOrder).toBeLessThan(resetOrder);
  });
});
