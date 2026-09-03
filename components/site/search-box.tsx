"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBoxProps {
  initialQuery?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function SearchBox({
  initialQuery = "",
  placeholder = "Search articles…",
  autoFocus = false,
  className,
  size = "md",
}: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <form onSubmit={submit} role="search" className={cn("relative", className)}>
      <Search
        size={size === "sm" ? 14 : 16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tx-3)]"
        aria-hidden
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={placeholder}
        className={cn(
          "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors",
          size === "sm" ? "pl-8 pr-3 py-1.5 text-sm" : "pl-9 pr-9 py-2.5 text-sm"
        )}
      />
    </form>
  );
}