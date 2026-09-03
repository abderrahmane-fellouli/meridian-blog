import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/site/article-card";
import { Pagination } from "@/components/site/pagination";
import { EmptyState } from "@/components/site/empty-state";
import { getTagBySlug, getPublishedPostsByTag, countPublishedPostsByTag } from "@/lib/services/posts";
import { PUBLIC_PAGE_SIZE } from "@/lib/site";

export default async function TagArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [{ slug }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const page = Math.max(1, Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1);

  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const [posts, total] = await Promise.all([
    getPublishedPostsByTag(slug, { limit: PUBLIC_PAGE_SIZE, offset: (page - 1) * PUBLIC_PAGE_SIZE }),
    countPublishedPostsByTag(slug),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Tag</p>
        <h1
          className="text-3xl sm:text-4xl font-semibold leading-tight text-[var(--tx-1)] mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          #{tag.name}
        </h1>
        <p className="text-xs text-[var(--tx-3)] mt-3">
          {total} {total === 1 ? "article" : "articles"}
        </p>
      </header>

      {posts.length === 0 ? (
        <EmptyState
          title={`No articles tagged ${tag.name} yet`}
          description="Articles using this tag will appear here as they are published."
          actionHref="/blog"
          actionLabel="Browse all articles"
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <ArticleCard key={post.id} post={post} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => (p === 1 ? `/blog/tag/${slug}` : `/blog/tag/${slug}?page=${p}`)}
          />
        </>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();
  return {
    title: `#${tag.name} articles`,
    description: `Articles tagged ${tag.name} on Meridian.`,
    alternates: { canonical: `/blog/tag/${tag.slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title: `#${tag.name} articles`,
      description: `Articles tagged ${tag.name} on Meridian.`,
    },
  };
}