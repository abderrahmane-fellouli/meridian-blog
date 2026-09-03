import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditorForm, type EditorInitialPost } from "@/components/admin/post-editor-form";
import { requireOwnerReady } from "@/lib/auth-server";
import { getPostForAdmin } from "@/lib/services/posts";
import { listCategories, listTags } from "@/lib/services/categories-tags";
import { parseBodyJson } from "@/lib/body";

export const metadata: Metadata = {
  title: "Edit post",
};

export default async function AdminEditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwnerReady();
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const [post, categories, tags] = await Promise.all([
    getPostForAdmin(id),
    listCategories(),
    listTags(),
  ]);

  if (!post) notFound();

  const initial: EditorInitialPost = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    bodyJson: parseBodyJson(post.bodyJson),
    status: post.status,
    categoryId: post.categoryId,
    tagIds: post.tags.map((t) => t.id),
    featuredImagePath: post.featuredImagePath,
    featuredImageAlt: post.featuredImageAlt,
    featured: post.featured,
    affiliateDisclosure: post.affiliateDisclosure,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    canonicalUrl: post.canonicalUrl,
    ogImagePath: post.ogImagePath,
    noindex: post.noindex,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    updatedAt: post.updatedAt.toISOString(),
  };

  return (
    <PostEditorForm
      categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      tags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
      initial={initial}
    />
  );
}