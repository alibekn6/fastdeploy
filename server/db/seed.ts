/**
 * Idempotent demo seed: the fixture posts/comments the example pages address
 * by id, plus a demo account. Run via `pnpm db:seed` (dotenv loads .env.local).
 */
import { commentsFixture, postsFixture } from "../../src/shared/api/mocks/fixtures";
import { hashPassword } from "../auth/password";
import { createDbClient } from "./client";
import { comments, posts, users } from "./schema";

const DEMO_EMAIL = "demo@fastdeploy.dev";
const DEMO_PASSWORD = "fastdeploy-demo-12";

async function main() {
  // biome-ignore lint/style/noProcessEnv: standalone script, runs outside the app
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — run `vercel env pull .env.local` first");
  const db = createDbClient(url);

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await db
    .insert(users)
    .values({ email: DEMO_EMAIL, passwordHash, name: "demo" })
    .onConflictDoNothing();

  await db.insert(posts).values(postsFixture).onConflictDoNothing();
  await db
    .insert(comments)
    .values(commentsFixture.map((c) => ({ ...c, at: new Date(c.at) })))
    .onConflictDoNothing();

  console.log(`Seeded demo data. Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
