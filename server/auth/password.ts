import { hash, verify } from "@node-rs/argon2";

/** Server-enforced policy (client validation is UX only — spec, OWASP ASVS 2.1.1). */
export const MIN_PASSWORD_LENGTH = 12;

// OWASP-recommended argon2id parameters: m=19 MiB, t=2, p=1.
const ARGON2_PARAMS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_PARAMS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password, ARGON2_PARAMS);
  } catch {
    return false;
  }
}

/**
 * Reference hash verified when the email is unknown, so "no such user" and
 * "wrong password" take the same time (login timing must not enumerate
 * accounts; the register 409 remains the documented enumeration tradeoff).
 */
export const TIMING_EQUALIZATION_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$3VxRXw/nOEHngeHDNxqEnw$L4shqo2Qd6ILZLzvlLWu63eQj9fOJlOMY006WtTxMVQ";
