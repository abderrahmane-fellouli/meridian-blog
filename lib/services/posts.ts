import {
  and,
  desc,
  eq,
  gte,
  inArray,
  lte,
  not,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  category,
  post,
  postTag,
  redirect,
  tag,
  user,
  type PostStatus,
} from "@/db/schema";
import { ensureUniqueSlug, slugify } from "@/lib/slug";
import { deriveExcerpt, type BodyDoc } from "@/lib/body";

export class PostConflictError extends Error {
  constructor() {
    super("Conflict detected — this post was modified elsewhere. Reload to see the latest version.");
  }
}

/** Single source of truth for "is this post visible to the public". */
export function isPubliclyVisible(
  status: string,
  publishedAt: Date | null
): boolean {
  return status === "published" && publishedAt !== null && publishedAt.getTime() <= Date.now();
}

export function publicPostCondition(now = new Date()) {
  return and(eq(post.status, "published"), lte(post.publishedAt, now));
}

function filterEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

export interface TagRef {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface AuthorRef {
  id: string;
  name: string;
  image: string | null;
}

export interface PostWithRelations {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  bodyJson: BodyDoc;
  status: PostStatus;
  categoryId: string | null;
  featuredImagePath: string | null;
  featuredImageAlt: string | null;
  featured: boolean;
  affiliateDisclosure: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  ogImagePath: string | null;
  noindex: boolean;
  authorId: string | null;
  author: AuthorRef | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category: CategoryRef | null;
  tags: TagRef[];
}

export type PostRow = typeof post.$inferSelect;

function mapPostRow(
  row: PostRow,
  categoryRow: { id: string; name: string; slug: string } | null,
  tagRows: { id: string; name: string; slug: string }[],
  authorRow: { id: string; name: string; image: string | null } | null
): PostWithRelations {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    bodyJson: row.bodyJson as BodyDoc,
    status: row.status,
    categoryId: row.categoryId,
    featuredImagePath: row.featuredImagePath,
    featuredImageAlt: row.featuredImageAlt,
    featured: row.featured,
    affiliateDisclosure: row.affiliateDisclosure,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    canonicalUrl: row.canonicalUrl,
    ogImagePath: row.ogImagePath,
    noindex: row.noindex,
    authorId: row.authorId,
    author: authorRow ? { id: authorRow.id, name: authorRow.name, image: authorRow.image } : null,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    category: categoryRow ? { id: categoryRow.id, name: categoryRow.name, slug: categoryRow.slug } : null,
    tags: tagRows.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
  };
}

async function tagsForPosts(postIds: string[]): Promise<Map<string, TagRef[]>> {
  const map = new Map<string, TagRef[]>();
  if (postIds.length === 0) return map;
  const rows = await db
    .select({
      postId: postTag.postId,
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
    })
    .from(postTag)
    .innerJoin(tag, eq(postTag.tagId, tag.id))
    .where(inArray(postTag.postId, postIds));
  for (const row of rows) {
    const list = map.get(row.postId) ?? [];
    list.push({ id: row.id, name: row.name, slug: row.slug });
    map.set(row.postId, list);
  }
  return map;
}

async function authorsForPosts(authorIds: string[]): Promise<Map<string, AuthorRef>> {
  const map = new Map<string, AuthorRef>();
  const unique = [...new Set(authorIds)];
  if (unique.length === 0) return map;
  const rows = await db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .where(inArray(user.id, unique));
  for (const row of rows) {
    map.set(row.id, row);
  }
  return map;
}

export async function getPublishedPosts(opts: { limit?: number; offset?: number } = {}): Promise<PostWithRelations[]> {
  const rows = await db
    .select()
    .from(post)
    .where(publicPostCondition())
    .orderBy(desc(post.publishedAt))
    .limit(Math.min(opts.limit ?? 20, 100))
    .offset(opts.offset ?? 0);
  return hydratePosts(rows);
}

/** Homepage hero: newest post flagged `featured`, falling back to the newest published post. */
export async function getHeroPost(): Promise<PostWithRelations | null> {
  const row = await db
    .select()
    .from(post)
    .where(and(publicPostCondition(), eq(post.featured, true)))
    .orderBy(desc(post.publishedAt))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (row) return (await hydratePosts([row]))[0] ?? null;
  return getPublishedPosts({ limit: 1 }).then((posts) => posts[0] ?? null);
}

export async function getPublishedPostsByCategory(
  categorySlug: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<PostWithRelations[]> {
  const rows = await db
    .select()
    .from(post)
    .innerJoin(category, eq(post.categoryId, category.id))
    .where(and(publicPostCondition(), eq(category.slug, categorySlug)))
    .orderBy(desc(post.publishedAt))
    .limit(Math.min(opts.limit ?? 20, 100))
    .offset(opts.offset ?? 0);
  const posts = rows.map((r) => r.post);
  return hydratePosts(posts, rows.map((r) => r.category));
}

export async function getPublishedPostBySlug(slug: string): Promise<PostWithRelations | null> {
  const row = await db
    .select()
    .from(post)
    .where(and(eq(post.slug, slug), publicPostCondition()))
    .then((rows) => rows[0] ?? null);
  if (!row) return null;
  const hydrated = await hydratePosts([row]);
  return hydrated[0] ?? null;
}

export async function getPostsForAdmin(): Promise<PostWithRelations[]> {
  const rows = await db
    .select()
    .from(post)
    .orderBy(desc(post.updatedAt))
    .limit(200);
  return hydratePosts(rows);
}

export async function getPostForAdmin(id: string): Promise<PostWithRelations | null> {
  const row = await db.select().from(post).where(eq(post.id, id)).then((r) => r[0] ?? null);
  if (!row) return null;
  const hydrated = await hydratePosts([row]);
  return hydrated[0] ?? null;
}

export async function countPublishedPosts(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(post)
    .where(publicPostCondition());
  return rows[0]?.count ?? 0;
}

export async function countAllPosts(): Promise<number> {
  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(post);
  return rows[0]?.count ?? 0;
}

export interface AdminStats {
  total: number;
  byStatus: Record<PostStatus, number>;
  publishedVisible: number;
  nextScheduled: PostWithRelations | null;
  recent: PostWithRelations[];
}

/** Dashboard aggregates. Raw counts grouped by status + one hydrated row set. */
export async function getAdminStats(): Promise<AdminStats> {
  const [grouped, publishedVisible, recentRows] = await Promise.all([
    db.select({ status: post.status, count: sql<number>`count(*)::int` }).from(post).groupBy(post.status),
    countPublishedPosts(),
    db.select().from(post).orderBy(desc(post.updatedAt)).limit(5),
  ]);
  const byStatus: Record<PostStatus, number> = { draft: 0, published: 0, scheduled: 0, archived: 0 };
  let total = 0;
  for (const r of grouped) {
    byStatus[r.status] = r.count ?? 0;
    total += r.count ?? 0;
  }
  const scheduled = await db
    .select()
    .from(post)
    .where(eq(post.status, "scheduled"))
    .orderBy(sql`${post.publishedAt} asc nulls last`)
    .limit(1)
    .then((r) => r[0] ?? null);
  const nextScheduled = scheduled ? (await hydratePosts([scheduled]))[0] ?? null : null;
  const recent = await hydratePosts(recentRows);
  return { total, byStatus, publishedVisible, nextScheduled, recent };
}

/** Published posts published strictly before/after a reference post (article prev/next). */
export async function getAdjacentPosts(
  reference: { publishedAt: Date; status: string; id: string }
): Promise<{ prev: PostWithRelations | null; next: PostWithRelations | null }> {
  const cond = (before: boolean) => {
    const direction = before
      ? and(eq(post.status, "published"), not(eq(post.id, reference.id)), lte(post.publishedAt, reference.publishedAt))
      : and(eq(post.status, "published"), not(eq(post.id, reference.id)), gte(post.publishedAt, reference.publishedAt));
    return direction;
  };
  const prevRow = await db
    .select()
    .from(post)
    .where(cond(true))
    .orderBy(desc(post.publishedAt))
    .limit(1)
    .then((r) => r[0] ?? null);
  const nextRow = await db
    .select()
    .from(post)
    .where(cond(false))
    .orderBy(ascPublished())
    .limit(1)
    .then((r) => r[0] ?? null);
  const pairs: Array<{ row: PostRow; slot: "prev" | "next" }> = [];
  if (prevRow) pairs.push({ row: prevRow, slot: "prev" });
  if (nextRow) pairs.push({ row: nextRow, slot: "next" });
  const hydrated = await hydratePosts(pairs.map((p) => p.row));
  const out: Record<"prev" | "next", PostWithRelations | null> = { prev: null, next: null };
  pairs.forEach((p, idx) => {
    out[p.slot] = hydrated[idx] ?? null;
  });
  return out;
}

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
}

export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const rows = await db
    .select({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      postCount: sql<number>`count(*) filter (where ${publicPostCondition()})::int`,
    })
    .from(category)
    .leftJoin(post, eq(post.categoryId, category.id))
    .groupBy(category.id)
    .orderBy(category.name);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    postCount: r.postCount ?? 0,
  }));
}

export async function getRelatedPosts(
  reference: { id: string; categoryId: string | null },
  limit = 3
): Promise<PostWithRelations[]> {
  if (!reference.categoryId) return [];
  const rows = await db
    .select()
    .from(post)
    .where(and(publicPostCondition(), eq(post.categoryId, reference.categoryId), not(eq(post.id, reference.id))))
    .orderBy(desc(post.publishedAt))
    .limit(limit);
  return hydratePosts(rows);
}

export async function getCategoryBySlug(slug: string): Promise<{ id: string; name: string; slug: string; description: string | null } | null> {
  const row = await db
    .select({ id: category.id, name: category.name, slug: category.slug, description: category.description })
    .from(category)
    .where(eq(category.slug, slug))
    .then((rows) => rows[0] ?? null);
  return row ?? null;
}

export async function getTagBySlug(slug: string): Promise<{ id: string; name: string; slug: string } | null> {
  const row = await db
    .select({ id: tag.id, name: tag.name, slug: tag.slug })
    .from(tag)
    .where(eq(tag.slug, slug))
    .then((rows) => rows[0] ?? null);
  return row ?? null;
}

export async function countPublishedPostsByCategory(categorySlug: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(post)
    .innerJoin(category, eq(post.categoryId, category.id))
    .where(and(publicPostCondition(), eq(category.slug, categorySlug)));
  return rows[0]?.count ?? 0;
}

export async function countPublishedPostsByTag(tagSlug: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(postTag)
    .innerJoin(tag, eq(postTag.tagId, tag.id))
    .innerJoin(post, eq(post.id, postTag.postId))
    .where(and(publicPostCondition(), eq(tag.slug, tagSlug)));
  return rows[0]?.count ?? 0;
}

export async function getPublishedPostsByTag(
  tagSlug: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<PostWithRelations[]> {
  const rows = await db
    .select()
    .from(postTag)
    .innerJoin(tag, eq(postTag.tagId, tag.id))
    .innerJoin(post, eq(post.id, postTag.postId))
    .where(and(publicPostCondition(), eq(tag.slug, tagSlug)))
    .orderBy(desc(post.publishedAt))
    .limit(Math.min(opts.limit ?? 20, 100))
    .offset(opts.offset ?? 0);
  const posts = rows.map((r) => r.post);
  return hydratePosts(posts);
}

async function hydratePosts(rows: PostRow[], categoryRows?: Array<{ id: string; name: string; slug: string }>): Promise<PostWithRelations[]> {
  if (rows.length === 0) return [];
  const tagMap = await tagsForPosts(rows.map((r) => r.id));
  const catMap = new Map<string, { id: string; name: string; slug: string }>();
  if (categoryRows) {
    for (const c of categoryRows) catMap.set(c.id, c);
  } else {
    const catIds = [...new Set(rows.map((r) => r.categoryId).filter((id): id is string => id !== null))];
    if (catIds.length > 0) {
      const cats = await db
        .select({ id: category.id, name: category.name, slug: category.slug })
        .from(category)
        .where(inArray(category.id, catIds));
      for (const c of cats) catMap.set(c.id, c);
    }
  }
  const authorMap = await authorsForPosts(
    [...new Set(rows.map((r) => r.authorId).filter((id): id is string => id !== null))]
  );
  return rows.map((row) =>
    mapPostRow(
      row,
      row.categoryId ? catMap.get(row.categoryId) ?? null : null,
      tagMap.get(row.id) ?? [],
      row.authorId ? authorMap.get(row.authorId) ?? null : null
    )
  );
}

/* ── Mutations ───────────────────────────────────────── */

export type PostCreateInput = {
  title: string;
  excerpt?: string | null;
  bodyJson: BodyDoc;
  status: PostStatus;
  slug?: string;
  categoryId?: string | null;
  featuredImagePath?: string | null;
  featuredImageAlt?: string | null;
  featured?: boolean;
  affiliateDisclosure?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  ogImagePath?: string | null;
  noindex?: boolean;
  authorId?: string | null;
  publishedAt?: Date | null;
  tagIds?: string[];
};

export type PostUpdateInput = Partial<PostCreateInput>;

export async function createPost(input: PostCreateInput): Promise<PostWithRelations> {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");
  const slug = await ensureUniqueSlug(input.slug?.trim() || title, slugExists);

  const now = new Date();
  const firstPublish = input.status === "published" && !input.publishedAt ? now : input.publishedAt ?? null;

  const created = await db
    .insert(post)
    .values({
      title,
      slug,
      excerpt: input.excerpt?.trim() || deriveExcerpt(input.bodyJson) || null,
      bodyJson: input.bodyJson as never,
      status: input.status,
      categoryId: input.categoryId ?? null,
      featuredImagePath: input.featuredImagePath ?? null,
      featuredImageAlt: input.featuredImageAlt ?? null,
      featured: input.featured ?? false,
      affiliateDisclosure: input.affiliateDisclosure ?? false,
      seoTitle: input.seoTitle !== undefined ? filterEmpty(input.seoTitle) : null,
      seoDescription: input.seoDescription !== undefined ? filterEmpty(input.seoDescription) : null,
      canonicalUrl: input.canonicalUrl !== undefined ? filterEmpty(input.canonicalUrl) : null,
      ogImagePath: input.ogImagePath !== undefined ? filterEmpty(input.ogImagePath) : null,
      noindex: input.noindex ?? false,
      authorId: input.authorId ?? null,
      publishedAt: firstPublish,
    })
    .returning();

  const row = created[0];
  if (input.tagIds?.length) {
    await setPostTags(db, row.id, input.tagIds);
  }
  const hydrated = await hydratePosts([row]);
  return hydrated[0];
}

/**
 * Persists editor changes. `expectedUpdatedAt` enables the autosave
 * version-guard: when it mismatches the row's current `updatedAt`, the save is
 * rejected instead of clobbering newer content.
 *
 * Slug changes are recorded as a one-hop redirect (source → current slug).
 */
export async function updatePost(
  id: string,
  input: PostUpdateInput,
  opts: { expectedUpdatedAt?: Date } = {}
): Promise<PostWithRelations> {
  const { row, slugRedirect } = await db.transaction(async (tx) => {
    let slugRedirect: { source: string; target: string } | null = null;

    const existing = await tx.select().from(post).where(eq(post.id, id)).then((r) => r[0] ?? null);
    if (!existing) throw new Error("Post not found.");

    if (opts.expectedUpdatedAt) {
      const expectedMs = Math.trunc(opts.expectedUpdatedAt.getTime() / 1000) * 1000;
      const actualMs = Math.trunc(existing.updatedAt.getTime() / 1000) * 1000;
      if (expectedMs !== actualMs) throw new PostConflictError();
    }

    const title = input.title?.trim() ?? existing.title;
    const explicitSlug = input.slug?.trim();
    const slugCandidate = explicitSlug ? slugify(explicitSlug) : slugify(title);
    const slug = await ensureUniqueSlug(slugCandidate, (s) => slugExists(s, id));

    if (slug !== existing.slug) {
      slugRedirect = { source: existing.slug, target: slug };
    }

    const publishedAt =
      input.status === "published"
        ? existing.publishedAt ?? new Date()
        : input.publishedAt !== undefined
          ? input.publishedAt
          : existing.publishedAt;

    let excerpt = input.excerpt;
    if (excerpt === undefined) excerpt = existing.excerpt;
    if (excerpt === null || String(excerpt).trim() === "") {
      excerpt = deriveExcerpt(input.bodyJson ?? (existing.bodyJson as BodyDoc)) || null;
    }

    const updated = await tx
      .update(post)
      .set({
        title,
        slug,
        excerpt: excerpt === null ? null : String(excerpt).trim(),
        bodyJson: (input.bodyJson as never) ?? existing.bodyJson,
        status: input.status ?? existing.status,
        categoryId: input.categoryId !== undefined ? input.categoryId : existing.categoryId,
        featuredImagePath:
          input.featuredImagePath !== undefined ? input.featuredImagePath : existing.featuredImagePath,
        featuredImageAlt:
          input.featuredImageAlt !== undefined ? input.featuredImageAlt : existing.featuredImageAlt,
        featured: input.featured !== undefined ? input.featured : existing.featured,
        affiliateDisclosure:
          input.affiliateDisclosure !== undefined ? input.affiliateDisclosure : existing.affiliateDisclosure,
        seoTitle: input.seoTitle !== undefined ? filterEmpty(input.seoTitle) : existing.seoTitle,
        seoDescription:
          input.seoDescription !== undefined ? filterEmpty(input.seoDescription) : existing.seoDescription,
        canonicalUrl: input.canonicalUrl !== undefined ? filterEmpty(input.canonicalUrl) : existing.canonicalUrl,
        ogImagePath: input.ogImagePath !== undefined ? filterEmpty(input.ogImagePath) : existing.ogImagePath,
        noindex: input.noindex !== undefined ? input.noindex : existing.noindex,
        authorId: input.authorId !== undefined ? input.authorId : existing.authorId,
        publishedAt,
      })
      .where(eq(post.id, id))
      .returning();

    const row = updated[0];
    if (input.tagIds) await setPostTags(tx, id, input.tagIds);
    return { row, slugRedirect };
  });

  if (slugRedirect) {
    await db
      .insert(redirect)
      .values({
        sourcePath: `/${slugRedirect.source}`,
        targetPath: `/${slugRedirect.target}`,
      })
      .onConflictDoNothing();
  }

  const hydrated = await hydratePosts([row]);
  return hydrated[0];
}

export async function deletePost(id: string): Promise<void> {
  await db.delete(post).where(eq(post.id, id));
}

/**
 * Duplicates a post as a new draft ("Copy of <title>"), copying body,
 * category, tags, featured image and author. Slug is derived from the copy
 * label and made unique by `createPost`.
 */
export async function duplicatePost(id: string): Promise<PostWithRelations> {
  const existing = await getPostForAdmin(id);
  if (!existing) throw new Error("Post not found.");
  return createPost({
    title: `Copy of ${existing.title}`,
    slug: `${existing.slug}-copy`,
    excerpt: existing.excerpt,
    bodyJson: existing.bodyJson,
    status: "draft",
    categoryId: existing.categoryId,
    featuredImagePath: existing.featuredImagePath,
    featuredImageAlt: existing.featuredImageAlt,
    affiliateDisclosure: existing.affiliateDisclosure,
    authorId: existing.authorId,
    publishedAt: null,
    tagIds: existing.tags.map((t) => t.id),
  });
}

async function slugExists(slug: string, exceptId?: string): Promise<boolean> {
  const rows = exceptId
    ? await db.select({ id: post.id }).from(post).where(and(eq(post.slug, slug), not(eq(post.id, exceptId)))).limit(1)
    : await db.select({ id: post.id }).from(post).where(eq(post.slug, slug)).limit(1);
  return rows.length > 0;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function setPostTags(tx: Tx | typeof db, postId: string, tagIds: string[]): Promise<void> {
  await tx.delete(postTag).where(eq(postTag.postId, postId));
  if (tagIds.length === 0) return;
  const uniqueIds = [...new Set(tagIds)];
  await tx.insert(postTag).values(uniqueIds.map((tagId) => ({ postId, tagId })));
}

function ascPublished() {
  return sql`${post.publishedAt} asc`;
}