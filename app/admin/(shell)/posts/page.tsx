import { PostsManager, type PostsManagerData } from "@/components/admin/posts-manager";
import { getPostsForAdmin } from "@/lib/services/posts";
import { listCategories, listTags } from "@/lib/services/categories-tags";
import { estimateReadingTime } from "@/lib/body";

export const dynamic = "force-dynamic";

async function loadManagerData(): Promise<PostsManagerData> {
  const [rows, categories, tags] = await Promise.all([getPostsForAdmin(), listCategories(), listTags()]);
  const readTimes = await Promise.all(rows.map((p) => estimateReadingTime(p.bodyJson)));
  const posts = rows.map((p, i) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
    excerpt: p.excerpt ?? "",
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    tags: p.tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
    featuredImagePath: p.featuredImagePath,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    updatedAt: p.updatedAt.toISOString(),
    readTimeMinutes: readTimes[i],
    views: null,
  }));
  return {
    posts,
    viewsAvailable: false,
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    tags: tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
  };
}

export default async function AdminPostsPage() {
  const data = await loadManagerData();

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto w-full">
      <PostsManager initial={data} />
    </div>
  );
}