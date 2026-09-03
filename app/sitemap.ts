import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/services/posts";
import { listCategories, listTags } from "@/lib/services/categories-tags";
import { absoluteUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, tags] = await Promise.all([getPublishedPosts(), listCategories(), listTags()]);

  const staticPaths = ["/", "/blog", "/about", "/contact", "/privacy", "/terms", "/affiliate-disclosure"];

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: absoluteUrl(`/blog/category/${c.slug}`),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const tagEntries: MetadataRoute.Sitemap = tags.map((t) => ({
    url: absoluteUrl(`/blog/tag/${t.slug}`),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [
    ...staticPaths.map((p) => ({
      url: absoluteUrl(p),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: p === "/" ? 1 : 0.7,
    })),
    ...postEntries,
    ...categoryEntries,
    ...tagEntries,
  ];
}