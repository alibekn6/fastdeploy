import { HTTPError } from "ky";
import { notFound } from "next/navigation";
import { type Post, postQueries } from "@/entities/post";
import { getQueryClient } from "@/shared/api/query-client";

/**
 * Fetches the example post through the request-scoped QueryClient (React
 * cache()), so the route layout, generateMetadata, and the page share ONE
 * network call. An unknown id resolves to notFound().
 */
export async function getSsrExamplePost(id: string): Promise<Post> {
  try {
    return await getQueryClient().fetchQuery(postQueries.detail(id));
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 404) notFound();
    throw error;
  }
}
