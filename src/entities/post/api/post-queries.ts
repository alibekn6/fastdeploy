import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { getValidated } from "@/shared/api/fetcher";

export const PostSchema = z.object({ id: z.string(), title: z.string(), body: z.string() });
export type Post = z.infer<typeof PostSchema>;
export const PostsSchema = z.array(PostSchema);

export const postKeys = { all: ["posts"] as const, list: () => [...postKeys.all, "list"] as const };

export const postQueries = {
  list: () =>
    queryOptions({ queryKey: postKeys.list(), queryFn: () => getValidated("posts", PostsSchema) }),
};
