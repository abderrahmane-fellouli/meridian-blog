import { relations, sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

/* ── Better Auth tables ──────────────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

  isOwner: boolean("is_owner").notNull().default(false),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    issuer: text("issuer").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)]
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Content tables ──────────────────────────────────── */

export const postStatus = pgEnum("post_status", [
  "draft",
  "published",
  "scheduled",
  "archived",
]);

export const post = pgTable(
  "post",
  () => ({
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    excerpt: text("excerpt"),
    bodyJson: jsonb("body_json").notNull(),
    status: postStatus("status").notNull().default("draft"),
    categoryId: uuid("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    featuredImagePath: text("featured_image_path"),
    featuredImageAlt: text("featured_image_alt"),
    featured: boolean("featured").notNull().default(false),
    affiliateDisclosure: boolean("affiliate_disclosure").notNull().default(false),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    canonicalUrl: text("canonical_url"),
    ogImagePath: text("og_image_path"),
    noindex: boolean("noindex").notNull().default(false),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('simple'::regconfig, coalesce("title", '') || ' ' || coalesce("excerpt", ''))`
    ),
  }),
  (t) => [
    index("post_status_published_idx").on(t.status, t.publishedAt),
    index("post_search_vector_idx").using("gin", t.searchVector),
    index("post_category_id_idx").on(t.categoryId),
    uniqueIndex("post_slug_idx").on(t.slug),
  ]
);

export const category = pgTable("category", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const tag = pgTable("tag", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const postTag = pgTable(
  "post_tag",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("post_tag_unique_idx").on(t.postId, t.tagId),
    index("post_tag_tag_id_idx").on(t.tagId),
  ]
);

export const redirect = pgTable("redirect", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourcePath: text("source_path").notNull().unique(),
  targetPath: text("target_path").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const media = pgTable("media", {
  id: uuid("id").defaultRandom().primaryKey(),
  storagePath: text("storage_path").notNull().unique(),
  urlPath: text("url_path").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  altText: text("alt_text"),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const setting = pgTable(
  "setting",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("setting_key_idx").on(t.key)]
);

export const loginAttempt = pgTable(
  "login_attempt",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    ip: text("ip").notNull(),
    succeeded: boolean("succeeded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("login_attempt_email_created_idx").on(t.email, t.createdAt),
    index("login_attempt_ip_created_idx").on(t.ip, t.createdAt),
  ]
);

export type PostStatus = (typeof postStatus.enumValues)[number];

/* ── Relations ───────────────────────────────────────── */

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  posts: many(post),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const postRelations = relations(post, ({ one, many }) => ({
  category: one(category, { fields: [post.categoryId], references: [category.id] }),
  author: one(user, { fields: [post.authorId], references: [user.id] }),
  tags: many(postTag),
}));

export const categoryRelations = relations(category, ({ many }) => ({
  posts: many(post),
}));

export const tagRelations = relations(tag, ({ many }) => ({
  posts: many(postTag),
}));

export const postTagRelations = relations(postTag, ({ one }) => ({
  post: one(post, { fields: [postTag.postId], references: [post.id] }),
  tag: one(tag, { fields: [postTag.tagId], references: [tag.id] }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  createdBy: one(user, { fields: [media.createdBy], references: [user.id] }),
}));

export const loginAttemptRelations = relations(loginAttempt, () => ({}));