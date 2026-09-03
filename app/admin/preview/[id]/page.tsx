import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/site/badge";
import { TableOfContents } from "@/components/site/table-of-contents";
import { renderBody } from "@/lib/render";
import { extractHeadings, estimateReadingTime } from "@/lib/body";
import { getPostForAdmin } from "@/lib/services/posts";
import { requireOwnerReady } from "@/lib/auth-server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Post preview",
  robots: { index: false, follow: false },
};

export default async function AdminPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwnerReady();
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const post = await getPostForAdmin(id);
  if (!post) notFound();

  const [headings, minutes] = await Promise.all([
    extractHeadings(post.bodyJson),
    estimateReadingTime(post.bodyJson),
  ]);
  const publishedAt = post.publishedAt ?? post.createdAt;

  return (
    <div className="bg-[var(--bg)] text-[var(--tx-1)] min-h-screen">
      <div className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/admin/posts/${post.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--tx-2)] hover:bg-[var(--bg-muted)] hover:text-[var(--tx-1)] transition-colors"
            >
              <ArrowLeft size={14} /> Back to editor
            </Link>
            <span className="text-xs text-[var(--tx-3)] hidden sm:inline">
              Previewing “{post.title}” — not indexed
            </span>
          </div>
          {post.status === "published" && (
            <Link
              href={`/blog/${post.slug}`}
              className="text-sm text-[var(--accent)] hover:text-[var(--accent-h)] font-medium transition-colors"
            >
              View public page →
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <div className="mb-4">
            {post.category && (
              <Link href={`/blog/category/${post.category.slug}`} className="inline-block">
                <Badge variant="category">{post.category.name}</Badge>
              </Link>
            )}
          </div>
          <h1
            className="text-3xl sm:text-4xl font-semibold leading-tight text-[var(--tx-1)] mb-4"
            style={{ fontFamily: "var(--font-display)", lineHeight: "1.2" }}
          >
            {post.title}
          </h1>
          {post.excerpt && <p className="text-lg text-[var(--tx-2)] leading-relaxed mb-6">{post.excerpt}</p>}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--tx-3)]">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} />
              {formatDate(publishedAt, "long")}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} />
              {minutes} min read
            </span>
            <Badge variant={post.status} dot>
              {post.status}
            </Badge>
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
      </div>
    </div>
  );
}