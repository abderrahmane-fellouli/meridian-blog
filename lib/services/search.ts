import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { category, post } from "@/db/schema";
import { publicPostCondition, type CategoryRef } from "@/lib/services/posts";

export interface SearchOptions {
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date | null;
  category: CategoryRef | null;
  rank: number;
}

export function sanitizeSearchQuery(query: string): string {
  const cleaned = String(query ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 200);
}

/**
 * PostgreSQL full-text search over the `search_vector` generated column
 * (regconfig "simple", same one used by the generated column).
 *
 * `websearch_to_tsquery` gives quoting/operator support; on a malformed query
 * (e.g. an unbalanced quote) we fall back to `plainto_tsquery`, which never
 * throws. Caveat: with regconfig 'simple' there are no stopwords, so the bare
 * words AND/OR/NOT are treated as search terms rather than operators; the
 * quoted forms (`"a" +"b"`, `-term`) still yield real tsquery operators.
 */
export async function searchPublishedPosts(
  rawQuery: string,
  opts: SearchOptions = {}
): Promise<{ results: SearchResult[]; total: number }> {
  const query = sanitizeSearchQuery(rawQuery);
  if (!query) {
    return { results: [], total: 0 };
  }

  const limit = Math.min(opts.limit ?? 20, 50);
  const offset = opts.offset ?? 0;

  const fallback = sql`plainto_tsquery('simple', ${query})`;
  const withOperator = sql`websearch_to_tsquery('simple', ${query})`;
  const condition = publicPostCondition();

  try {
    return await runQuery(withOperator);
  } catch {
    return await runQuery(fallback);
  }

  async function runQuery(tsquery: ReturnType<typeof sql>): Promise<{ results: SearchResult[]; total: number }> {
    const baseWhere = and(condition, sql`${post.searchVector} @@ ${tsquery}`);
    const totalRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(post)
      .where(baseWhere);
    const rows = await db
      .select({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        publishedAt: post.publishedAt,
        categoryId: post.categoryId,
        categoryName: category.name,
        categorySlug: category.slug,
        rank: sql<number>`ts_rank(${post.searchVector}, ${tsquery})::double precision`,
      })
      .from(post)
      .leftJoin(category, eq(post.categoryId, category.id))
      .where(baseWhere)
      .orderBy(desc(sql`ts_rank(${post.searchVector}, ${tsquery})`))
      .limit(limit)
      .offset(offset);
    return {
      results: rows.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        excerpt: r.excerpt,
        publishedAt: r.publishedAt,
        category: r.categoryId && r.categoryName && r.categorySlug ? { id: r.categoryId, name: r.categoryName, slug: r.categorySlug } : null,
        rank: r.rank ?? 0,
      })),
      total: totalRows[0]?.count ?? 0,
    };
  }
}

/** Simple LIKE fallback for partial/"fuzzy" matches not covered by tsquery. */
export async function searchPublishedPostsBySubstring(
  rawQuery: string,
  opts: SearchOptions = {}
): Promise<{ results: SearchResult[]; total: number }> {
  const query = sanitizeSearchQuery(rawQuery);
  if (!query) return { results: [], total: 0 };
  const pattern = `%${query.replace(/[%_]/g, (c) => `\\${c}`)}%`;
  const like = sql`${post.title} ilike ${pattern}`;
  const totalRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(post)
    .where(and(publicPostCondition(), like));
  const rows = await db
    .select({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      publishedAt: post.publishedAt,
      categoryId: post.categoryId,
      categoryName: category.name,
      categorySlug: category.slug,
    })
    .from(post)
    .leftJoin(category, eq(post.categoryId, category.id))
    .where(and(publicPostCondition(), like))
    .orderBy(desc(post.publishedAt))
    .limit(Math.min(opts.limit ?? 20, 50))
    .offset(opts.offset ?? 0);
  return {
    results: rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      publishedAt: r.publishedAt,
      category: r.categoryId && r.categoryName && r.categorySlug ? { id: r.categoryId, name: r.categoryName, slug: r.categorySlug } : null,
      rank: 0,
    })),
    total: totalRows[0]?.count ?? 0,
  };
}