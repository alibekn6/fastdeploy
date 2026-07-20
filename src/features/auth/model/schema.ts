import { z } from "zod";

type Translator = (key: "emailInvalid" | "passwordRequired") => string;

/**
 * Localized sign-in schema factory (messages come from the `Auth` namespace).
 * Sign-in validates presence only — no policy is imposed on existing passwords.
 */
export const makeSignInSchema = (t: Translator) =>
  z.object({
    email: z.string().email(t("emailInvalid")),
    password: z.string().min(1, t("passwordRequired")),
  });

export type SignInInput = z.infer<ReturnType<typeof makeSignInSchema>>;

type SignUpTranslator = (
  key: "emailInvalid" | "passwordTooShort" | "passwordTooLong" | "passwordMismatch",
) => string;

/**
 * Localized sign-up schema factory. Password policy is length-only (12–128,
 * NIST/OWASP guidance — no composition rules) with a required confirmation;
 * no name field — the backend derives the display name from the email.
 */
export const makeSignUpSchema = (t: SignUpTranslator) =>
  z
    .object({
      email: z.string().email(t("emailInvalid")),
      password: z.string().min(12, t("passwordTooShort")).max(128, t("passwordTooLong")),
      confirmPassword: z.string(),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t("passwordMismatch"),
      path: ["confirmPassword"],
    });

export type SignUpInput = z.infer<ReturnType<typeof makeSignUpSchema>>;
