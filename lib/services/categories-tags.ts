import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { category, tag } from "@/db/schema";
import { ensureUniqueSlug } from "@/lib/slug";

export type CategoryRow = typeof category.$inferSelect;
export type TagRow = typeof tag.$inferSelect;

export async function listCategories(): Promise<CategoryRow[]> {
  return db.select().from(category).orderBy(asc(category.name));
}

export async function listTags(): Promise<TagRow[]> {
  return db.select().from(tag).orderBy(asc(tag.name));
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  return db.select().from(category).where(eq(category.slug, slug)).then((r) => r[0] ?? null);
}

export async function getTagBySlug(slug: string): Promise<TagRow | null> {
  return db.select().from(tag).where(eq(tag.slug, slug)).then((r) => r[0] ?? null);
}

async function categorySlugExists(slug: string): Promise<boolean> {
  return db.select({ id: category.id }).from(category).where(eq(category.slug, slug)).limit(1).then((r) => r.length > 0);
}

async function tagSlugExists(slug: string): Promise<boolean> {
  return db.select({ id: tag.id }).from(tag).where(eq(tag.slug, slug)).limit(1).then((r) => r.length > 0);
}

/** Returns the existing category, or creates one, and its slug. Idempotent by name. */
export async function getOrCreateCategory(name: string, description?: string): Promise<CategoryRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required.");
  const existing = await db
    .select()
    .from(category)
    .where(eq(category.name, trimmed))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (existing) return existing;
  const slug = await ensureUniqueSlug(trimmed, categorySlugExists);
  const created = await db
    .insert(category)
    .values({ name: trimmed, slug, description: description?.trim() || null })
    .returning();
  return created[0];
}

/** Returns the existing tag, or creates one. Idempotent by name. */
export async function getOrCreateTag(name: string): Promise<TagRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name is required.");
  const existing = await db
    .select()
    .from(tag)
    .where(eq(tag.name, trimmed))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (existing) return existing;
  const slug = await ensureUniqueSlug(trimmed, tagSlugExists);
  const created = await db.insert(tag).values({ name: trimmed, slug }).returning();
  return created[0];
}

export async function getOrCreateCategories(names: string[]): Promise<CategoryRow[]> {
  const out: CategoryRow[] = [];
  for (const name of names) {
    out.push(await getOrCreateCategory(name));
  }
  return out;
}

export async function getOrCreateTags(names: string[]): Promise<TagRow[]> {
  const out: TagRow[] = [];
  for (const name of names) {
    out.push(await getOrCreateTag(name));
  }
  return out;
}

export async function updateCategory(
  id: string,
  patch: { name: string; description?: string | null }
): Promise<CategoryRow> {
  const name = patch.name.trim();
  if (!name) throw new Error("Category name is required.");
  const existing = await db.select().from(category).where(eq(category.id, id)).then((r) => r[0] ?? null);
  if (!existing) throw new Error("Category not found.");
  const slug = name === existing.name ? existing.slug : await ensureUniqueSlug(name, categorySlugExists);
  const updated = await db
    .update(category)
    .set({ name, slug, description: patch.description === undefined ? existing.description : patch.description })
    .where(eq(category.id, id))
    .returning();
  return updated[0];
}

export async function deleteCategory(id: string): Promise<void> {
  await db.delete(category).where(eq(category.id, id));
}

export async function updateTag(id: string, patch: { name: string }): Promise<TagRow> {
  const name = patch.name.trim();
  if (!name) throw new Error("Tag name is required.");
  const existing = await db.select().from(tag).where(eq(tag.id, id)).then((r) => r[0] ?? null);
  if (!existing) throw new Error("Tag not found.");
  const slug = name === existing.name ? existing.slug : await ensureUniqueSlug(name, tagSlugExists);
  const updated = await db
    .update(tag)
    .set({ name, slug })
    .where(eq(tag.id, id))
    .returning();
  return updated[0];
}

export async function deleteTag(id: string): Promise<void> {
  await db.delete(tag).where(eq(tag.id, id));
}

export async function tagsByIds(ids: string[]): Promise<TagRow[]> {
  if (ids.length === 0) return [];
  return db.select().from(tag).where(inArray(tag.id, ids)).orderBy(asc(tag.name));
}

export async function categoriesByIds(ids: string[]): Promise<CategoryRow[]> {
  if (ids.length === 0) return [];
  return db.select().from(category).where(inArray(category.id, ids)).orderBy(asc(category.name));
}