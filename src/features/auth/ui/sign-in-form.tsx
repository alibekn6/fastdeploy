"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { routes } from "@/shared/config/routes";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { signInAction } from "../api/sign-in";
import { type SignInInput, signInSchema } from "../model/schema";

export function SignInForm() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-4"
      onSubmit={handleSubmit(async (values) => {
        await signInAction(values);
        router.push(routes.dashboard);
      })}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={emailId}>Email</Label>
        <Input id={emailId} type="email" {...register("email")} />
        {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={passwordId}>Password</Label>
        <Input id={passwordId} type="password" {...register("password")} />
        {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}
