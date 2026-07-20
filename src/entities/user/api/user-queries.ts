import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { getValidated } from "@/shared/api/fetcher";

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  is_active: z.boolean(),
});
export type User = z.infer<typeof UserSchema>;

export const userKeys = {
  all: ["users"] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
};

export const userQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: userKeys.detail(id),
      queryFn: () => getValidated(`users/${id}`, UserSchema),
    }),
};
