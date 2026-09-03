import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

function visiblePages(page: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("…");
    out.push(sorted[i]);
  }
  return out;
}

export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const base =
    "inline-flex items-center justify-center min-w-9 h-9 px-2.5 rounded-lg text-sm transition-colors focus-ring";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 mt-10">
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className={cn(base, "text-[var(--tx-2)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-muted)]")}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </Link>
      ) : (
        <span className={cn(base, "text-[var(--tx-3)] opacity-50 cursor-not-allowed")} aria-hidden>
          <ChevronLeft size={16} />
        </span>
      )}

      {visiblePages(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="text-sm text-[var(--tx-3)] px-1">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              base,
              p === page
                ? "bg-[var(--accent)] text-white font-medium"
                : "text-[var(--tx-2)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-muted)]"
            )}
          >
            {p}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          className={cn(base, "text-[var(--tx-2)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-muted)]")}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span className={cn(base, "text-[var(--tx-3)] opacity-50 cursor-not-allowed")} aria-hidden>
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}