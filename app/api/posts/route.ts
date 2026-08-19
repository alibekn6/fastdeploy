import { getDb } from "@server/db";
import { posts } from "@server/db/schema";
import { serverFailure } from "@server/http";
import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await getDb()
      .select({ id: posts.id, title: posts.title, body: posts.body })
      .from(posts)
      .orderBy(asc(posts.createdAt));
    return NextResponse.json(rows);
  } catch (error) {
    return serverFailure(error);
  }
}
