import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { postQueries } from "@/entities/post";
import { getQueryClient } from "@/shared/api/query-client";
import { Header } from "@/widgets/header";
import { PostList } from "./post-list";

export function DashboardPage() {
  const t = useTranslations("Dashboard");
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(postQueries.list());
  return (
    <div>
      <Header />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <PostList />
        </HydrationBoundary>
      </main>
    </div>
  );
}
