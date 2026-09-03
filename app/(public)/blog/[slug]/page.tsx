import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect, notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, ChevronRight, Clock } from "lucide-react";
import { ArticleCard } from "@/components/site/article-card";
import { Badge } from "@/components/site/badge";
import { TableOfContents } from "@/components/site/table-of-contents";
import { ShareBar } from "@/components/site/share-bar";
import { renderBody } from "@/lib/render";
import { extractHeadings, estimateReadingTime } from "@/lib/body";
import { resolvePublicArticle } from "@/lib/article";
import { getRelatedPosts, getAdjacentPosts } from "@/lib/services/posts";
import { getSettings } from "@/lib/services/settings";
import { formatDate, initials } from "@/lib/format";
import { absoluteUrl } from "@/lib/url";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { post, redirectTo } = await resolvePublicArticle(slug);
  if (redirectTo) permanentRedirect(redirectTo);
  if (!post) notFound();

  const [headings, minutes, adjacent, related, settings] = await Promise.all([
    extractHeadings(post.bodyJson),
    estimateReadingTime(post.bodyJson),
    getAdjacentPosts({ publishedAt: post.publishedAt ?? new Date(), status: post.status, id: post.id }),
    getRelatedPosts({ id: post.id, categoryId: post.categoryId }, 3),
    getSettings(),
  ]);

  const publishedAt = post.publishedAt ?? post.createdAt;
  const isUpdated =
    post.updatedAt.getTime() - publishedAt.getTime() > 24 * 60 * 60 * 1000 && post.updatedAt > publishedAt;
  const authorInitials = initials(post.author?.name);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {(() => {
        const headline = post.seoTitle ?? post.title;
        const description = post.seoDescription ?? post.excerpt ?? undefined;
        const image = post.ogImagePath ?? post.featuredImagePath ?? settings.defaultOgImagePath ?? undefined;
        const canonicalPath = post.canonicalUrl ?? `/blog/${post.slug}`;
        const jsonLd = {
          "@context": "https://schema.org",
          "@type": "Article",
          headline,
          description,
          image,
          datePublished: publishedAt.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": absoluteUrl(canonicalPath),
          },
          author: post.author
            ? { "@type": "Person", name: post.author.name }
            : { "@type": "Person", name: settings.authorName },
          publisher: { "@type": "Organization", name: settings.siteName },
        };
        return (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        );
      })()}
      <nav className="flex items-center gap-1.5 text-xs text-[var(--tx-3)] mb-8" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[var(--tx-1)] transition-colors">
          Home
        </Link>
        <ChevronRight size={12} />
        <Link href="/blog" className="hover:text-[var(--tx-1)] transition-colors">
          Blog
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--tx-2)]">{post.category?.name ?? "Article"}</span>
      </nav>

      <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-12 xl:gap-16">
        <div className="min-w-0">
          <header className="mb-8">
            <div className="mb-4">
              {post.category && (
                <Link href={`/blog/category/${post.category.slug}`} className="inline-block">
                  <Badge variant="category">{post.category.name}</Badge>
                </Link>
              )}
            </div>

            <h1
              className="text-3xl sm:text-4xl lg:text-[2.6rem] font-semibold leading-tight text-[var(--tx-1)] mb-4"
              style={{ fontFamily: "var(--font-display)", lineHeight: "1.2" }}
            >
              {post.title}
            </h1>

            {post.excerpt && <p className="text-lg text-[var(--tx-2)] leading-relaxed mb-6">{post.excerpt}</p>}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-6 border-b border-[var(--border)]">
              {post.author && (
                <>
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-[var(--accent)] text-white text-xs font-semibold flex items-center justify-center">
                      {authorInitials}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[var(--tx-1)]">{post.author.name}</div>
                    </div>
                  </div>
                  <div className="h-4 w-px bg-[var(--border)] hidden sm:block" />
                </>
              )}
              <span className="flex items-center gap-1.5 text-sm text-[var(--tx-3)]">
                <Calendar size={13} />
                {formatDate(publishedAt, "long")}
              </span>
              {isUpdated && (
                <span className="text-sm text-[var(--tx-3)]">Updated {formatDate(post.updatedAt, "long")}</span>
              )}
              <span className="flex items-center gap-1.5 text-sm text-[var(--tx-3)]">
                <Clock size={13} />
                {minutes} min read
              </span>
            </div>
          </header>

          {post.featuredImagePath && (
            <div className="aspect-[21/9] rounded-2xl overflow-hidden bg-[var(--bg-muted)] mb-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.featuredImagePath}
                alt={post.featuredImageAlt ?? post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <TableOfContents entries={headings} />

          <article className="prose">{renderBody(post.bodyJson)}</article>

          {post.affiliateDisclosure && (
            <div className="mt-8 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] text-sm text-[var(--tx-3)]">
              <span className="font-medium text-[var(--tx-2)]">Disclosure:</span>{" "}
              This article contains affiliate links. I may earn a commission at no extra cost to you.
            </div>
          )}

          {post.tags.length > 0 && (
            <div className="mt-10 pt-8 border-t border-[var(--border)]">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium text-[var(--tx-3)] mr-1">Tagged:</span>
                {post.tags.map((tag) => (
                  <Link key={tag.id} href={`/blog/tag/${tag.slug}`}>
                    <Badge variant="tag">#{tag.name}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <ShareBar title={post.title} />
          </div>

          {post.author && (
            <div className="mt-10 pt-8 border-t border-[var(--border)] lg:hidden">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-10 rounded-full bg-[var(--accent)] text-white text-sm font-semibold flex items-center justify-center">
                    {authorInitials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--tx-1)]">{post.author.name}</div>
                    <div className="text-xs text-[var(--tx-3)]">Author</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-10 pt-8 border-t border-[var(--border)] grid grid-cols-2 gap-4">
            {adjacent.prev ? (
              <Link
                href={`/blog/${adjacent.prev.slug}`}
                className="group text-left p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface)] transition-all"
              >
                <div className="flex items-center gap-1.5 text-xs text-[var(--tx-3)] mb-2">
                  <ArrowLeft size={12} /> Previous
                </div>
                <div className="text-sm font-medium text-[var(--tx-1)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                  {adjacent.prev.title}
                </div>
              </Link>
            ) : (
              <div />
            )}

            {adjacent.next && (
              <Link
                href={`/blog/${adjacent.next.slug}`}
                className="group text-right p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface)] transition-all"
              >
                <div className="flex items-center justify-end gap-1.5 text-xs text-[var(--tx-3)] mb-2">
                  Next <ArrowRight size={12} />
                </div>
                <div className="text-sm font-medium text-[var(--tx-1)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                  {adjacent.next.title}
                </div>
              </Link>
            )}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-8">
            <TableOfContents entries={headings} />

            {post.author && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-10 rounded-full bg-[var(--accent)] text-white text-sm font-semibold flex items-center justify-center">
                    {authorInitials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--tx-1)]">{post.author.name}</div>
                    <div className="text-xs text-[var(--tx-3)]">Author</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16 pt-10 border-t border-[var(--border)]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)] mb-6">
            Related articles
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((post) => (
              <ArticleCard key={post.id} post={post} variant="compact" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { post, redirectTo } = await resolvePublicArticle(slug);
  if (redirectTo) return { title: "Article moved" };
  if (!post) notFound();
  const publishedAt = post.publishedAt ?? post.createdAt;
  const settings = await getSettings();
  const seoTitle = post.seoTitle ?? post.title;
  const seoDescription = post.seoDescription ?? post.excerpt ?? undefined;
  const canonical = post.canonicalUrl ?? `/blog/${post.slug}`;
  const ogImage = post.ogImagePath ?? post.featuredImagePath ?? settings.defaultOgImagePath;
  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical },
    robots: post.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      title: seoTitle,
      description: seoDescription,
      publishedTime: publishedAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.author ? [post.author.name] : undefined,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}