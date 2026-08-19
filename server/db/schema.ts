import { bigserial, boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Server-side refresh-token ledger (spec: no rotation, but server-side
 * revocation must be possible). Only the `jti` claim is stored — never the
 * token itself.
 */
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    jti: uuid("jti").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("refresh_tokens_user_idx").on(t.userId)],
);

/** Sliding-window rate-limit ledger for `auth/login` and `auth/register`. */
export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    key: text("key").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_attempts_key_at_idx").on(t.key, t.at)],
);

// Text ids so the seeded demo content keeps the fixture ids ("1") the example
// pages and e2e suite address directly.
export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    author: text("author").notNull(),
    body: text("body").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
  },
  (t) => [index("comments_post_idx").on(t.postId)],
);
