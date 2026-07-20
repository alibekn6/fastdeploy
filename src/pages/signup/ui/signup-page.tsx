import { useTranslations } from "next-intl";
import { SignUpForm } from "@/features/auth";

export function SignupPage() {
  const t = useTranslations("Auth");
  return (
    <main className="flex min-h-svh items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-2xl font-semibold">{t("signUpTitle")}</h1>
        <SignUpForm />
      </div>
    </main>
  );
}
