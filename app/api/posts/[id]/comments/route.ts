import { getDb } from "@server/db";
import { comments, posts } from "@server/db/schema";
import { serverFailure } from "@server/http";
import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/** Server selects and orders (`at` DESC, spec A12) — clients render response order. */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const db = getDb();
    const post = await db.query.posts.findFirst({ where: eq(posts.id, id) });
    if (!post) return new NextResponse(null, { status: 404 });
    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.postId, id))
      .orderBy(desc(comments.at));
    return NextResponse.json(
      rows.map((c) => ({
        id: c.id,
        postId: c.postId,
        author: c.author,
        body: c.body,
        at: c.at.toISOString(),
      })),
    );
  } catch (error) {
    return serverFailure(error);
  }
}
