import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { getValidated } from "@/shared/api/fetcher";

export const PostSchema = z.object({ id: z.string(), title: z.string(), body: z.string() });
export type Post = z.infer<typeof PostSchema>;
export const PostsSchema = z.array(PostSchema);

export const CommentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  author: z.string(),
  body: z.string(),
  at: z.iso.datetime(),
});
export type Comment = z.infer<typeof CommentSchema>;
export const CommentsSchema = z.array(CommentSchema);

export const postKeys = {
  all: ["posts"] as const,
  list: () => [...postKeys.all, "list"] as const,
  details: () => [...postKeys.all, "detail"] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
  comments: (id: string) => [...postKeys.detail(id), "comments"] as const,
};

export const postQueries = {
  list: () =>
    queryOptions({ queryKey: postKeys.list(), queryFn: () => getValidated("posts", PostsSchema) }),
  // retry: false on the example queries — the SSR example demos error recovery,
  // so failures should surface to the boundary promptly; the ky transport
  // already retries retryable statuses (limit 2) underneath.
  detail: (id: string) =>
    queryOptions({
      queryKey: postKeys.detail(id),
      queryFn: () => getValidated(`posts/${id}`, PostSchema),
      retry: false,
    }),
  comments: (id: string) =>
    queryOptions({
      queryKey: postKeys.comments(id),
      queryFn: () => getValidated(`posts/${id}/comments`, CommentsSchema),
      retry: false,
    }),
};
