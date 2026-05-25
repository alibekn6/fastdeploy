export async function register() {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { server } = await import("./src/shared/api/mocks/node");
    server.listen({ onUnhandledRequest: "bypass" });
  }
}
