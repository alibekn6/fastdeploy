// Deterministic mock data served by the MSW handlers. Plain literals only:
// shared must not import entities, so the shapes are re-validated against the
// entity Zod schemas in `src/entities/post/api/post-queries.test.ts`.

export const postsFixture = [{ id: "1", title: "First", body: "Hello" }];

// Pinned A12 contract: exactly 10 comments for post "1", pre-sorted by `at`
// descending. The `GET posts/:id/comments` handler serves this array VERBATIM
// (server selects and orders); clients render response order and never re-sort.
export const commentsFixture = [
  {
    id: "c10",
    postId: "1",
    author: "Dana Whitfield",
    body: "Streaming made this page feel instant.",
    at: "2026-07-16T10:09:00.000Z",
  },
  {
    id: "c09",
    postId: "1",
    author: "Rustam Aliyev",
    body: "Nested Suspense is doing real work here.",
    at: "2026-07-15T18:44:00.000Z",
  },
  {
    id: "c08",
    postId: "1",
    author: "Mbelissa Ortega",
    body: "The loading skeleton matches the final layout.",
    at: "2026-07-15T09:12:00.000Z",
  },
  {
    id: "c07",
    postId: "1",
    author: "Timur Bekov",
    body: "Metadata reflects the post title — nice touch.",
    at: "2026-07-14T21:30:00.000Z",
  },
  {
    id: "c06",
    postId: "1",
    author: "Grace Osei",
    body: "Retry after a server error actually recovers.",
    at: "2026-07-14T08:05:00.000Z",
  },
  {
    id: "c05",
    postId: "1",
    author: "Viktor Lindqvist",
    body: "Comments arrive after the shell — as designed.",
    at: "2026-07-13T16:58:00.000Z",
  },
  {
    id: "c04",
    postId: "1",
    author: "Aigerim Nurlanova",
    body: "Good reference for force-dynamic pages.",
    at: "2026-07-13T07:41:00.000Z",
  },
  {
    id: "c03",
    postId: "1",
    author: "Paulo Mendes",
    body: "The 404 path renders the localized not-found UI.",
    at: "2026-07-12T19:23:00.000Z",
  },
  {
    id: "c02",
    postId: "1",
    author: "Hana Sato",
    body: "Copying this pattern into our product page.",
    at: "2026-07-12T11:17:00.000Z",
  },
  {
    id: "c01",
    postId: "1",
    author: "Omar Haddad",
    body: "First comment — testing the stream.",
    at: "2026-07-11T22:50:00.000Z",
  },
];
