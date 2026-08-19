import { getDb } from "@server/db";
import { users } from "@server/db/schema";
import { authenticate, serverFailure } from "@server/http";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/** Non-auth block: flat body, bare status errors (spec §2.4). Requires auth — email is PII. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!(await authenticate(request))) return new NextResponse(null, { status: 401 });
    const { id } = await ctx.params;
    const user = await getDb().query.users.findFirst({ where: eq(users.id, id) });
    if (!user) return new NextResponse(null, { status: 404 });
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      is_active: user.isActive,
    });
  } catch (error) {
    return serverFailure(error);
  }
}
