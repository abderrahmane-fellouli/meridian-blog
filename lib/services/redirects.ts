import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { redirect } from "@/db/schema";

export type RedirectRow = typeof redirect.$inferSelect;

/** Normalizes an incoming path: leading slash, collapsed slashes, no trailing slash (root stays "/"). */
export function normalizeSourcePath(input: string): string {
  let p = String(input).trim();
  if (!p) return "/";
  p = p.split(/[?#]/)[0].replace(/\/{2,}/g, "/");
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && p.endsWith("/")) p = p.replace(/\/+$/, "");
  return p;
}

export async function listRedirects(opts: { limit?: number; offset?: number } = {}): Promise<RedirectRow[]> {
  return db
    .select()
    .from(redirect)
    .orderBy(desc(redirect.updatedAt))
    .limit(Math.min(opts.limit ?? 50, 200))
    .offset(opts.offset ?? 0);
}

export async function resolveRedirect(sourcePath: string): Promise<RedirectRow | null> {
  const source = normalizeSourcePath(sourcePath);
  return db
    .select()
    .from(redirect)
    .where(eq(redirect.sourcePath, source))
    .then((rows) => rows[0] ?? null);
}

export async function createRedirect(sourcePath: string, targetPath: string): Promise<RedirectRow> {
  const source = normalizeSourcePath(sourcePath);
  const target = normalizeSourcePath(targetPath);
  if (!target || target === "/") throw new Error("Redirect target is required and must not be the root.");
  if (source === target) throw new Error("Redirect source and target must differ.");
  const existing = await resolveRedirect(source);
  if (existing) {
    if (existing.targetPath === target) return existing;
    const updated = await db
      .update(redirect)
      .set({ targetPath: target })
      .where(eq(redirect.id, existing.id))
      .returning();
    return updated[0];
  }
  const created = await db.insert(redirect).values({ sourcePath: source, targetPath: target }).returning();
  return created[0];
}

export async function deleteRedirect(id: string): Promise<void> {
  await db.delete(redirect).where(eq(redirect.id, id));
}