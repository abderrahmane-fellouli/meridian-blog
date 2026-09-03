"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Rss, Search, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { site } from "@/lib/site";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const navItems = [{ label: "Blog", href: "/blog" }];

export function Header({ theme, siteName, tagline }: { theme: Theme; siteName?: string; tagline?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setMobileOpen(false);
    setSearchOpen(false);
    setQuery("");
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg)]/95 backdrop-blur-sm border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 group focus-ring rounded"
          >
            <span
              className="font-display text-xl font-semibold tracking-tight text-[var(--tx-1)] group-hover:text-[var(--accent)] transition-colors"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {siteName ?? site.name}
            </span>
            <span className="hidden sm:inline-block text-xs text-[var(--tx-3)] font-sans mt-0.5 font-normal">
              {tagline ?? site.tagline}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-ring",
                  isActive(item.href)
                    ? "text-[var(--accent)] bg-[var(--accent-muted)]"
                    : "text-[var(--tx-2)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-muted)]"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            {searchOpen ? (
              <form onSubmit={submitSearch} className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search articles…"
                  aria-label="Search articles"
                  className="w-48 sm:w-64 px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery("");
                  }}
                  className="p-1.5 rounded-md text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-muted)] focus-ring"
                  aria-label="Close search"
                >
                  <X size={16} />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-md text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-muted)] transition-colors focus-ring"
                aria-label="Search"
              >
                <Search size={16} />
              </button>
            )}

            <ThemeToggle theme={theme} />

            <Link
              href="/feed.xml"
              className="hidden sm:flex p-2 rounded-md text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-muted)] transition-colors focus-ring"
              aria-label="RSS feed"
            >
              <Rss size={16} />
            </Link>

            <Link
              href="/admin"
              className="hidden md:flex ml-1 px-3 py-1.5 text-xs font-medium text-[var(--tx-3)] hover:text-[var(--tx-1)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-muted)] transition-colors focus-ring"
            >
              Admin
            </Link>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 rounded-md text-[var(--tx-2)] hover:bg-[var(--bg-muted)] transition-colors focus-ring"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg)]">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            <form onSubmit={submitSearch} className="flex items-center gap-2 px-3 py-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles…"
                aria-label="Search articles"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="p-2 rounded-md text-[var(--tx-2)] hover:bg-[var(--bg-muted)] transition-colors"
                aria-label="Submit search"
              >
                <Search size={16} />
              </button>
            </form>
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="text-left px-3 py-2.5 rounded-md text-sm font-medium text-[var(--tx-2)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-muted)] transition-colors"
            >
              Home
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "text-[var(--accent)] bg-[var(--accent-muted)]"
                    : "text-[var(--tx-2)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-muted)]"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="text-left px-3 py-2.5 rounded-md text-sm font-medium text-[var(--tx-2)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-muted)] transition-colors"
            >
              Admin
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}