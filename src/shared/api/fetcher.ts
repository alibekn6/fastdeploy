import type { KyInstance, Options } from "ky";
import type { ZodType } from "zod";
import { http } from "./http";

// NOTE: when the real API ships an OpenAPI spec, generate per-endpoint schemas
// (openapi-typescript / orval) and keep this transport. Only the schemas change.
export async function getValidated<T>(path: string, schema: ZodType<T>, options?: Options, client: KyInstance = http): Promise<T> {
  const json = await client.get(path, options).json<unknown>();
  return schema.parse(json);
}

export async function postValidated<T>(path: string, schema: ZodType<T>, body: unknown, options?: Options, client: KyInstance = http): Promise<T> {
  const json = await client.post(path, { json: body, ...options }).json<unknown>();
  return schema.parse(json);
}
