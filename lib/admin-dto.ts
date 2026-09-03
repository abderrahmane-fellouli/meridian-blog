import type { PostWithRelations } from "@/lib/services/posts";

/** JSON-safe shape of a post for admin client forms (dates → ISO strings). */
export interface AdminPostDto {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  bodyJson: unknown;
  status: "draft" | "published" | "scheduled" | "archived";
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
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string } | null;
  tags: { id: string; name: string; slug: string }[];
}

export function toAdminDto(post: PostWithRelations): AdminPostDto {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    bodyJson: post.bodyJson,
    status: post.status,
    categoryId: post.categoryId,
    featuredImagePath: post.featuredImagePath,
    featuredImageAlt: post.featuredImageAlt,
    featured: post.featured,
    affiliateDisclosure: post.affiliateDisclosure,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    canonicalUrl: post.canonicalUrl,
    ogImagePath: post.ogImagePath,
    noindex: post.noindex,
    authorId: post.authorId,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    category: post.category,
    tags: post.tags,
  };
}