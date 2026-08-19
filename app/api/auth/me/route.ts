import { getDb } from "@server/db";
import { users } from "@server/db/schema";
import { authError, authenticate, envelope, serverFailure } from "@server/http";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const claims = await authenticate(request);
    if (!claims) return authError(401, "unauthorized", "Not authenticated");

    const user = await getDb().query.users.findFirst({ where: eq(users.id, claims.sub) });
    if (!user?.isActive) return authError(401, "unauthorized", "Not authenticated");

    return envelope({ id: user.id, email: user.email, name: user.name, is_active: user.isActive });
  } catch (error) {
    return serverFailure(error);
  }
}
