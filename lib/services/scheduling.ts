import { and, eq, lte } from "drizzle-orm";
import { db, type Database } from "@/lib/db";
import { post } from "@/db/schema";

/**
 * Promotes every post that is due: still `status = 'scheduled'` with a
 * `publishedAt` at or before the reference time (default now). The status
 * guard makes the operation idempotent — running it repeatedly promotes each
 * post exactly once, and already-published posts are never touched.
 *
 * Returns the ids of the posts that were promoted. The database write is a
 * single time-consistent transaction; callers are expected to revalidate any
 * cached public pages afterward.
 */
export async function publishDueScheduled(
  now = new Date(),
  dbArg: Database = db
): Promise<string[]> {
  const rows = await dbArg.transaction(async (tx) => {
    const updated = await tx
      .update(post)
      .set({ status: "published" })
      .where(and(eq(post.status, "scheduled"), lte(post.publishedAt, now)))
      .returning({ id: post.id });
    return updated.map((r) => r.id);
  });
  return rows;
}
