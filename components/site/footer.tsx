import Link from "next/link";
import { AtSign, GitBranch, Globe, Rss, X, type LucideIcon } from "lucide-react";
import { site as defaultSite } from "@/lib/site";

function socialIcon(label: string): LucideIcon {
  const normalized = label.toLowerCase();
  if (normalized.includes("github") || normalized.includes("gitlab")) return GitBranch;
  if (normalized.includes("twitter") || normalized.includes("x")) return X;
  if (normalized.includes("mastodon") || normalized.includes("bluesky") || normalized.includes("linkedin") || normalized.includes("threads")) return AtSign;
  return Globe;
}

export function Footer({
  siteName,
  footerTagline,
  authorName,
  socialLinks,
}: {
  siteName?: string;
  footerTagline?: string;
  authorName?: string;
  socialLinks?: Array<{ label?: string | null; url?: string | null }>;
}) {
  const name = siteName ?? defaultSite.name;
  const tagline = footerTagline ?? defaultSite.footerTagline;
  const links = (socialLinks ?? []).filter(
    (l): l is { label: string; url: string } => Boolean(l?.label && l?.url)
  );

  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-[var(--bg-muted)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <Link
              href="/"
              className="font-display text-lg font-semibold text-[var(--tx-1)] hover:text-[var(--accent)] transition-colors"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {name}
            </Link>
            <p className="mt-1 text-sm text-[var(--tx-3)] max-w-xs">{tagline}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--tx-3)]">
            <Link href="/blog" className="hover:text-[var(--tx-1)] transition-colors">
              Blog
            </Link>
            <Link href="/about" className="hover:text-[var(--tx-1)] transition-colors">
              About
            </Link>
            <Link href="/contact" className="hover:text-[var(--tx-1)] transition-colors">
              Contact
            </Link>
            <Link href="/privacy" className="hover:text-[var(--tx-1)] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--tx-1)] transition-colors">
              Terms
            </Link>
            <Link href="/affiliate-disclosure" className="hover:text-[var(--tx-1)] transition-colors">
              Disclosures
            </Link>
            <Link href="/search" className="hover:text-[var(--tx-1)] transition-colors">
              Search
            </Link>
            <Link href="/feed.xml" className="hover:text-[var(--tx-1)] transition-colors flex items-center gap-1">
              <Rss size={14} /> RSS
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[var(--tx-3)]">
          <p>
            © {new Date().getFullYear()} {authorName ?? defaultSite.author.name}. All rights reserved.
          </p>
          {links.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              {links.map((l, idx) => {
                const Icon = socialIcon(l.label);
                return (
                  <a
                    key={`${l.label}-${idx}`}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--tx-1)] transition-colors flex items-center gap-1.5"
                  >
                    <Icon size={14} /> {l.label}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}