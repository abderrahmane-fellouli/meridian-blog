import type { Metadata } from "next";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { SearchBox } from "@/components/site/search-box";
import { Pagination } from "@/components/site/pagination";
import { EmptyState } from "@/components/site/empty-state";
import { Badge } from "@/components/site/badge";
import { sanitizeSearchQuery, searchPublishedPosts, searchPublishedPostsBySubstring, type SearchResult } from "@/lib/services/search";
import { formatDate } from "@/lib/format";
import { PUBLIC_PAGE_SIZE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Search",
  description: "Search every article on Meridian.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: false },
};

async function collectResults(query: string): Promise<SearchResult[]> {
  const [fts, sub] = await Promise.all([
    searchPublishedPosts(query, { limit: 50, offset: 0 }),
    searchPublishedPostsBySubstring(query, { limit: 50, offset: 0 }),
  ]);
  const byId = new Map<string, SearchResult>();
  for (const r of fts.results) byId.set(r.id, r);
  for (const r of sub.results) if (!byId.has(r.id)) byId.set(r.id, r);
  const ordered = [
    ...fts.results,
    ...sub.results.filter((r) => !fts.results.some((f) => f.id === r.id)),
  ];
  return ordered;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const raw = Array.isArray(q) ? q[0] : q;
  const query = sanitizeSearchQuery(raw ?? "");
  const page = Math.max(1, Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1);

  const results = query ? await collectResults(query) : [];
  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));
  const pageResults = query ? results.slice((page - 1) * PUBLIC_PAGE_SIZE, page * PUBLIC_PAGE_SIZE) : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Find it</p>
        <h1
          className="text-3xl sm:text-4xl font-semibold leading-tight text-[var(--tx-1)] mb-5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Search
        </h1>
        <div className="max-w-xl">
          <SearchBox initialQuery={query} autoFocus={!query} />
        </div>
      </header>

      {!query ? (
        <EmptyState
          title="Search Meridian"
          description="Type a topic above to search the full text of every published article — titles, excerpts, and bodies."
        />
      ) : (
        <>
          <p className="text-sm text-[var(--tx-3)] mb-6">
            {total === 0
              ? `No articles found for “${query}”.`
              : `${total} ${total === 1 ? "article" : "articles"} found for “${query}”.`}
          </p>

          {total === 0 ? (
            <EmptyState
              title="No results"
              description="Try a different keyword — search matches article titles and full body text."
              actionHref="/blog"
              actionLabel="Browse all articles"
            />
          ) : (
            <>
              <div className="flex flex-col divide-y divide-[var(--border)]">
                {pageResults.map((result) => (
                  <article key={result.id} className="group py-5 px-1 -mx-1 rounded-lg hover:bg-[var(--bg-muted)] transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                      {result.category && (
                        <Badge variant="category">{result.category.name}</Badge>
                      )}
                    </div>
                    <h2>
                      <Link
                        href={`/blog/${result.slug}`}
                        className="font-display text-lg font-semibold leading-snug text-[var(--tx-1)] group-hover:text-[var(--accent)] transition-colors"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {result.title}
                      </Link>
                    </h2>
                    {result.excerpt && (
                      <p className="text-sm text-[var(--tx-2)] leading-relaxed line-clamp-2 mt-1.5">{result.excerpt}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-[var(--tx-3)] mt-2">
                      <Calendar size={11} />
                      {formatDate(result.publishedAt)}
                    </div>
                  </article>
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} buildHref={(p) => `/search?q=${encodeURIComponent(query)}&page=${p}`} />
            </>
          )}
        </>
      )}
    </div>
  );
}