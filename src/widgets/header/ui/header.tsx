"use client";
import { useRouter } from "next/navigation";
import { routes } from "@/shared/config/routes";
import { Button } from "@/shared/ui/button";

export function Header() {
  const router = useRouter();
  return (
    <header className="flex items-center justify-between border-b p-4">
      <span className="font-semibold">nextjs-frontend</span>
      <Button
        variant="outline"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push(routes.login);
        }}
      >
        Sign out
      </Button>
    </header>
  );
}
