import { http, HttpResponse } from "msw";
import { env } from "@/shared/config/env";

const api = (path: string) => new URL(path, env.NEXT_PUBLIC_API_URL).toString();

export const handlers = [
  http.get(api("/users/:id"), ({ params }) => HttpResponse.json({ id: params.id, name: "Ada Lovelace" })),
  http.get(api("/posts"), () =>
    HttpResponse.json([{ id: "1", title: "First", body: "Hello" }])),
  http.post(api("/auth/login"), async ({ request }) => {
    const body = (await request.json()) as { email: string };
    return HttpResponse.json({ token: "mock-token", user: { id: "u1", name: body.email } });
  }),
];
