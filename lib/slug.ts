/** ASCII-slugifies a string: "Bon café & thé" → "bon-cafe-the". */
export function slugify(input: string): string {
  const slug = input
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['"]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return slug || "untitled";
}

/** Appends -2, -3, … until the slug is unique for the given checker. */
export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const candidate = slugify(base);
  if (!(await exists(candidate))) return candidate;
  let n = 2;
  while (await exists(`${candidate}-${n}`)) {
    n += 1;
  }
  return `${candidate}-${n}`;
}