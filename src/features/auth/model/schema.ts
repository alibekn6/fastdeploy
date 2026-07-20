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
