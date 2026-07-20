export const routes = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
  examplesSsr: (id: string) => `/examples/ssr/${id}`,
  examplesWebsocket: "/examples/websocket",
} as const;
