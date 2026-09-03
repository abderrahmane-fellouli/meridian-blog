import { getPublishedPostBySlug } from "@/lib/services/posts";
import { resolveRedirect } from "@/lib/services/redirects";
import type { PostWithRelations } from "@/lib/services/posts";

/**
 * Resolves an article slug for the public `/blog/[slug]` route.
 *
 * Step 6 slug redirects are stored in bare-path form (`/old-slug` →
 * `/new-slug`), so a post that was published under an older slug needs a
 * one-hop remap here. Only published posts are ever returned — draft,
 * scheduled, and archived posts stay invisible. One hop only, matching the
 * redirect service contract.
 */
export async function resolvePublicArticle(
  slug: string
): Promise<{ post: PostWithRelations | null; redirectTo: string | null }> {
  const direct = await getPublishedPostBySlug(slug);
  if (direct) return { post: direct, redirectTo: null };

  const hop = await resolveRedirect(`/${slug}`);
  if (hop) {
    const segments = hop.targetPath.replace(/^\/+/, "").split("/").filter(Boolean);
    const targetSlug = segments.at(-1);
    if (targetSlug && targetSlug !== slug) {
      const targetPost = await getPublishedPostBySlug(targetSlug);
      if (targetPost) return { post: targetPost, redirectTo: `/blog/${targetSlug}` };
    }
  }

  return { post: null, redirectTo: null };
}