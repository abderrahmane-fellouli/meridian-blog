import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/site/article-card";
import { SearchBox } from "@/components/site/search-box";
import { Pagination } from "@/components/site/pagination";
import { EmptyState } from "@/components/site/empty-state";
import { getPublishedPosts, countPublishedPosts, getCategoriesWithCounts } from "@/lib/services/posts";
import { PUBLIC_PAGE_SIZE } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "All articles",
  description: "Every article on Meridian — software, databases, distributed systems, and the craft of building.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1);

  const [posts, total, categories] = await Promise.all([
    getPublishedPosts({ limit: PUBLIC_PAGE_SIZE, offset: (page - 1) * PUBLIC_PAGE_SIZE }),
    countPublishedPosts(),
    getCategoriesWithCounts(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));
  const topics = categories.filter((c) => c.postCount > 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <header className="mb-10">
        <h1
          className="text-4xl font-semibold text-[var(--tx-1)] mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          All articles
        </h1>
        <p className="text-[var(--tx-2)]">
          {total} articles across {topics.length} topics
        </p>

        <div className="relative mb-8 mt-8 max-w-lg">
          <SearchBox initialQuery="" />
        </div>

        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <Link
              href="/blog"
              className={cn(
                "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all",
                "bg-[var(--accent)] text-white border-[var(--accent)]"
              )}
            >
              All
            </Link>
            {topics.map((cat) => (
              <Link
                key={cat.slug}
                href={`/blog/category/${cat.slug}`}
                className="px-3.5 py-1.5 rounded-full text-sm font-medium border border-[var(--border)] text-[var(--tx-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      {posts.length === 0 ? (
        <EmptyState
          title="No articles yet"
          description="Articles will appear here as they are published. Check back soon."
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <ArticleCard key={post.id} post={post} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} buildHref={(p) => (p === 1 ? "/blog" : `/blog?page=${p}`)} />
        </>
      )}
    </div>
  );
}