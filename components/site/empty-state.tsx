import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export function EmptyState({ title, description, actionHref, actionLabel, className }: EmptyStateProps) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center", className)}>
      <p className="font-display text-lg font-semibold text-[var(--tx-1)] mb-2" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </p>
      <p className="text-sm text-[var(--tx-2)] leading-relaxed mb-5 max-w-md mx-auto">{description}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--tx-2)] hover:bg-[var(--bg-muted)] transition-colors"
        >
          <ArrowLeft size={14} />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}