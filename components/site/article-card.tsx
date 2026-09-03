import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import type { PostWithRelations } from "@/lib/services/posts";
import { Badge } from "@/components/site/badge";
import { formatDate, initials } from "@/lib/format";
import { estimateReadingTime } from "@/lib/body";
import { site } from "@/lib/site";

interface ArticleCardProps {
  post: PostWithRelations;
  variant?: "default" | "featured" | "compact";
  priority?: boolean;
}

export function ArticleCard({ post, variant = "default", priority = false }: ArticleCardProps) {
  const category = post.category;
  const author = post.author;
  const minutes = estimateReadingTime(post.bodyJson);
  const href = `/blog/${post.slug}`;

  /* eslint-disable @next/next/no-img-element */
  if (variant === "featured") {
    return (
      <Link
        href={href}
        className="group grid md:grid-cols-[1fr_400px] gap-8 items-center p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 transition-all hover:shadow-[var(--shadow-md)]"
      >
        <div className="order-2 md:order-1 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {category && <Badge variant="category">{category.name}</Badge>}
            <span className="text-xs text-[var(--tx-3)]">Featured</span>
          </div>

          <h2
            className="text-2xl sm:text-3xl font-semibold leading-tight text-[var(--tx-1)] group-hover:text-[var(--accent)] transition-colors"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {post.title}
          </h2>

          <p className="text-[var(--tx-2)] leading-relaxed text-base">{post.excerpt}</p>

          <div className="flex items-center gap-4 text-xs text-[var(--tx-3)]">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              {formatDate(post.publishedAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              {minutes} min read
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="size-7 rounded-full bg-[var(--accent)] text-white text-xs font-semibold flex items-center justify-center">
              {initials(author?.name)}
            </div>
            <span className="text-sm font-medium text-[var(--tx-2)]">{author?.name}</span>
          </div>
        </div>

        {post.featuredImagePath && (
          <div className="order-1 md:order-2">
            <div className="aspect-[16/10] rounded-xl overflow-hidden bg-[var(--bg-muted)]">
              <img
                src={post.featuredImagePath}
                alt={post.featuredImageAlt ?? post.title}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>
        )}
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className="group flex gap-4 items-start py-4 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-muted)] -mx-3 px-3 rounded-lg transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {category && <Badge variant="category" className="text-[10px] py-0.5">{category.name}</Badge>}
          </div>
          <h3 className="text-sm font-medium text-[var(--tx-1)] group-hover:text-[var(--accent)] transition-colors leading-snug line-clamp-2">
            {post.title}
          </h3>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--tx-3)]">
            <span className="flex items-center gap-1"><Clock size={11} />{minutes} min</span>
            {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
          </div>
        </div>
        {post.featuredImagePath && (
          <div className="size-16 rounded-lg overflow-hidden shrink-0 bg-[var(--bg-muted)]">
            <img src={post.featuredImagePath} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-md)] transition-all"
    >
      {post.featuredImagePath ? (
        <div className="aspect-[16/9] overflow-hidden bg-[var(--bg-muted)]">
          <img
            src={post.featuredImagePath}
            alt={post.featuredImageAlt ?? post.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading={priority ? "eager" : "lazy"}
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-[var(--bg-muted)] flex items-center justify-center">
          <span className="font-display text-xs uppercase tracking-widest text-[var(--tx-3)]" style={{ fontFamily: "var(--font-display)" }}>
            {site.name}
          </span>
        </div>
      )}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2">
          {category && <Badge variant="category">{category.name}</Badge>}
        </div>
        <h3
          className="text-lg font-semibold leading-snug text-[var(--tx-1)] group-hover:text-[var(--accent)] transition-colors line-clamp-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {post.title}
        </h3>
        <p className="text-sm text-[var(--tx-2)] leading-relaxed line-clamp-2 flex-1">{post.excerpt}</p>
        <div className="flex items-center gap-4 text-xs text-[var(--tx-3)] pt-1 border-t border-[var(--border-muted)]">
          <span className="flex items-center gap-1.5">
            <Calendar size={11} />
            {formatDate(post.publishedAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={11} />
            {minutes} min read
          </span>
        </div>
      </div>
    </Link>
  );
}