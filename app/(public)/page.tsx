import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { ArticleCard } from "@/components/site/article-card";
import { getHeroPost, getPublishedPosts, getCategoriesWithCounts } from "@/lib/services/posts";
import { getSettings } from "@/lib/services/settings";
import { absoluteUrl } from "@/lib/url";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: { absolute: settings.siteName },
    description: settings.description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: settings.siteName,
      title: settings.siteName,
      description: settings.description,
      images: settings.defaultOgImagePath ? [settings.defaultOgImagePath] : undefined,
    },
  };
}

export default async function HomePage() {
  const [heroPost, recentPosts, categories, settings] = await Promise.all([
    getHeroPost(),
    getPublishedPosts({ limit: 5 }),
    getCategoriesWithCounts(),
    getSettings(),
  ]);

  const featured = heroPost ?? recentPosts[0] ?? null;
  const latest = recentPosts.filter((p) => !featured || p.id !== featured.id).slice(0, 3);
  const topics = categories.filter((c) => c.postCount > 0);
  const authorInitials =
    settings.authorName
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "M";

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": absoluteUrl("/#organization"),
                name: settings.siteName,
                description: settings.description,
                url: absoluteUrl("/"),
                ...(settings.socialLinks.find((l) => l.url)
                  ? { sameAs: settings.socialLinks.filter((l) => l.url).map((l) => l.url) }
                  : {}),
              },
              {
                "@type": "WebSite",
                "@id": absoluteUrl("/#website"),
                url: absoluteUrl("/"),
                name: settings.siteName,
                description: settings.description,
                publisher: { "@id": absoluteUrl("/#organization") },
              },
            ],
          }),
        }}
      />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-10">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-4">
            {settings.tagline}
          </p>
          <h1
            className="text-4xl sm:text-5xl font-semibold leading-tight text-[var(--tx-1)] mb-5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Writing about software, <em className="not-italic text-[var(--accent)]">clearly.</em>
          </h1>
          <p className="text-lg text-[var(--tx-2)] leading-relaxed mb-6 max-w-xl">
            Deep dives on TypeScript, distributed systems, databases, and the craft of building
            software that holds up. No fluff, no hype.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-h)] transition-colors"
            >
              Browse articles <ArrowRight size={15} />
            </Link>
            {(() => {
              const firstSocial = settings.socialLinks.find((l) => l.url);
              if (firstSocial) {
                return (
                  <a
                    href={firstSocial.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--tx-2)] hover:bg-[var(--bg-muted)] transition-colors"
                  >
                    <X size={15} /> Follow
                  </a>
                );
              }
              return (
                <Link
                  href="/feed.xml"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--tx-2)] hover:bg-[var(--bg-muted)] transition-colors"
                >
                  <X size={15} /> Follow
                </Link>
              );
            })()}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="border-t border-[var(--border)] mb-12" />
      </div>

      {featured && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)]">Featured</h2>
          </div>
          <ArticleCard post={featured} variant="featured" priority />
        </section>
      )}

      {latest.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)]">Latest</h2>
            <Link
              href="/blog"
              className="text-sm text-[var(--accent)] hover:text-[var(--accent-h)] font-medium inline-flex items-center gap-1 transition-colors"
            >
              All articles <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {latest.map((post) => (
              <ArticleCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {topics.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
          <div className="border-t border-[var(--border)] pt-12">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)] mb-6">Topics</h2>
            <div className="flex flex-wrap gap-2">
              {topics.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/blog/category/${cat.slug}`}
                  className="px-4 py-2 rounded-full border border-[var(--border)] text-sm text-[var(--tx-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="size-16 rounded-full bg-[var(--accent)] text-white text-xl font-semibold flex items-center justify-center shrink-0">
              {authorInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)] mb-2">About</p>
              <h3
                className="text-xl font-semibold text-[var(--tx-1)] mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {settings.authorName}
              </h3>
              <p className="text-[var(--tx-2)] leading-relaxed mb-4 max-w-lg">{settings.authorBio}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}