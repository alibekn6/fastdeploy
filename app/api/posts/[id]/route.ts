import { getDb } from "@server/db";
import { posts } from "@server/db/schema";
import { serverFailure } from "@server/http";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const post = await getDb().query.posts.findFirst({ where: eq(posts.id, id) });
    if (!post) return new NextResponse(null, { status: 404 });
    return NextResponse.json({ id: post.id, title: post.title, body: post.body });
  } catch (error) {
    return serverFailure(error);
  }
}
