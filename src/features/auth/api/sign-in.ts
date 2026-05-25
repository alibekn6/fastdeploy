import { signInSchema, type SignInInput } from "../model/schema";

export async function signIn(input: SignInInput) {
  const parsed = signInSchema.parse(input);
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });
  if (!res.ok) throw new Error("Sign in failed");
}
