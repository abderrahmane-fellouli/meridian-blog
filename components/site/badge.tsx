import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "published" | "draft" | "scheduled" | "archived" | "category" | "tag" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const styles: Record<BadgeVariant, string> = {
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  draft: "bg-[var(--bg-muted)] text-[var(--tx-2)] border border-[var(--border)]",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  archived: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400",
  category: "bg-[var(--accent-muted)] text-[var(--accent)] font-medium",
  tag: "bg-[var(--bg-muted)] text-[var(--tx-2)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors",
  neutral: "bg-[var(--bg-muted)] text-[var(--tx-2)]",
};

const dotColors: Record<BadgeVariant, string> = {
  published: "bg-emerald-500",
  draft: "bg-[var(--tx-3)]",
  scheduled: "bg-blue-500",
  archived: "bg-zinc-400",
  category: "bg-[var(--accent)]",
  tag: "bg-[var(--tx-3)]",
  neutral: "bg-[var(--tx-3)]",
};

export function Badge({ variant = "neutral", children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        styles[variant],
        className
      )}
    >
      {dot && <span className={cn("inline-block size-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}