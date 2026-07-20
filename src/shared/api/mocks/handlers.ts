import { delay, HttpResponse, http } from "msw";
import { env } from "@/shared/config/env";
import { commentsFixture, postsFixture } from "./fixtures";
import { getCommentsFailure, setCommentsFailure } from "./mock-control";

const api = (path: string) => new URL(path, env.NEXT_PUBLIC_API_URL).toString();

export const handlers = [
  http.get(api("/users/:id"), ({ params }) =>
    HttpResponse.json({ id: params.id, name: "Ada Lovelace" }),
  ),
  http.get(api("/posts"), () => HttpResponse.json(postsFixture)),
  http.get(api("/posts/:id"), ({ params }) => {
    const post = postsFixture.find((p) => p.id === params.id);
    if (!post) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(post);
  }),
  // Non-auth endpoint: flat Comment[] body, bare HTTP status errors, no
  // envelope. Serves the pinned fixture VERBATIM behind a 2 s delay so the
  // nested Suspense boundary demonstrably streams. Stateless/reentrant apart
  // from the documented mock-control failure injection.
  http.get(api("/posts/:id/comments"), async ({ params }) => {
    const failure = getCommentsFailure();
    if (failure !== null) return new HttpResponse(null, { status: failure });
    if (params.id !== "1") return new HttpResponse(null, { status: 404 });
    await delay(2000);
    return HttpResponse.json(commentsFixture);
  }),
  // Test-only control endpoint (see mock-control.ts) — exists only in mock mode
  // because the handlers array itself is only registered there.
  http.post(api("/__mock/comments-failure"), async ({ request }) => {
    const { status } = (await request.json()) as { status: number | null };
    setCommentsFailure(status ?? null);
    return HttpResponse.json({ ok: true });
  }),
  http.post(api("/auth/login"), async ({ request }) => {
    const body = (await request.json()) as { email: string };
    return HttpResponse.json({ token: "mock-token", user: { id: "u1", name: body.email } });
  }),
  http.post(api("/auth/logout"), () => HttpResponse.json({ ok: true })),
];
