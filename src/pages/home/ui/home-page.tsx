import Link from "next/link";
import { routes } from "@/shared/config/routes";
import { Button } from "@/shared/ui/button";

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">nextjs-fullstack</h1>
      <p className="text-muted-foreground">FSD + Next.js boilerplate.</p>
      <Button asChild>
        <Link href={routes.login}>Get started</Link>
      </Button>
    </main>
  );
}
