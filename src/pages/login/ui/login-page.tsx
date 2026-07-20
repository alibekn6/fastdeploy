import { useTranslations } from "next-intl";
import { SignInForm } from "@/features/auth";

export function LoginPage() {
  const t = useTranslations("Auth");
  return (
    <main className="flex min-h-svh items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <SignInForm />
      </div>
    </main>
  );
}
