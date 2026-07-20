import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { useQuery } from "@tanstack/react-query";
import { expect, within } from "storybook/test";

/**
 * Infrastructure probe (bead F9a): verifies that the global `withQueryClient`
 * decorator supplies a QueryClient and that the framework's built-in
 * next/navigation mock records router calls. Not a product story.
 */
function QueryProbe() {
  const { data } = useQuery({
    queryKey: ["storybook-probe"],
    queryFn: () => Promise.resolve("query-client-ok"),
  });
  return <p>{data ?? "loading"}</p>;
}

const meta = {
  title: "Storybook/Probe",
  component: QueryProbe,
  tags: ["test"],
} satisfies Meta<typeof QueryProbe>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("query-client-ok")).toBeVisible();

    getRouter().push("/probe");
    await expect(getRouter().push).toHaveBeenCalledOnce();
    await expect(getRouter().push).toHaveBeenCalledWith("/probe");
  },
};
