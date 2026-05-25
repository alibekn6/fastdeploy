import { listPosts } from "@/entities/post";
import { CreatePostForm } from "@/features/create-post";
import { Card } from "@/shared/ui/card";
import { Header } from "@/widgets/header";

export async function DashboardPage() {
  const items = await listPosts();
  return (
    <div>
      <Header />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <CreatePostForm />
        <ul className="flex flex-col gap-2">
          {items.map((p) => (
            <li key={p.id}>
              <Card className="p-4">
                <strong>{p.title}</strong> — {p.content}
              </Card>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
