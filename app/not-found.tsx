import Link from "next/link";
import { site } from "@/lib/site";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center py-20">
        <p className="font-display text-6xl font-semibold text-[var(--tx-1)] mb-4" style={{ fontFamily: "var(--font-display)" }}>
          404
        </p>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Page not found</p>
        <p className="text-[var(--tx-2)] leading-relaxed mb-8">
          The page you were looking for doesn&apos;t exist, or it may have moved. Search the archive or head back
          home.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-h)] transition-colors"
          >
            Back home
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--tx-2)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            Search {site.name}
          </Link>
        </div>
      </div>
    </main>
  );
}