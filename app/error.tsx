"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center py-20">
        <p className="font-display text-6xl font-semibold text-[var(--tx-1)] mb-4" style={{ fontFamily: "var(--font-display)" }}>
          Oops
        </p>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Something went wrong</p>
        <p className="text-[var(--tx-2)] leading-relaxed mb-8">
          An unexpected error occurred while rendering this page. Try again, or head back home.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-h)] transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--tx-2)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}