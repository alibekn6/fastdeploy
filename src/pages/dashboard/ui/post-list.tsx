"use client";
import { useQuery } from "@tanstack/react-query";
import { postQueries } from "@/entities/post";
import { Card } from "@/shared/ui/card";

export function PostList() {
  const { data } = useQuery(postQueries.list());
  return (
    <ul className="flex flex-col gap-2">
      {data?.map((p) => (
        <li key={p.id}>
          <Card className="p-4">
            <strong>{p.title}</strong> — {p.body}
          </Card>
        </li>
      ))}
    </ul>
  );
}
