"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TocEntry {
  id: string;
  level: number;
  text: string;
}

interface TableOfContentsProps {
  entries: TocEntry[];
}

export function TableOfContents({ entries }: TableOfContentsProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (entries.length === 0) return;
    const observer = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    for (const entry of entries) {
      const el = document.getElementById(entry.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const Content = (
    <nav aria-label="Table of contents">
      <ul className="space-y-0.5">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              onClick={() => scrollTo(entry.id)}
              className={cn(
                "block w-full text-left text-sm leading-snug py-1 px-2 rounded-md transition-colors",
                entry.level >= 3 && "pl-5",
                activeId === entry.id
                  ? "text-[var(--accent)] bg-[var(--accent-muted)] font-medium"
                  : "text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-muted)]"
              )}
            >
              {entry.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <>
      <div className="hidden lg:block">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--tx-3)] mb-3 px-2">
          On this page
        </p>
        {Content}
      </div>

      <div className="lg:hidden mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--tx-2)]"
          aria-expanded={mobileOpen}
        >
          <span>Table of contents</span>
          <ChevronDown
            size={16}
            className={cn("transition-transform text-[var(--tx-3)]", mobileOpen ? "rotate-180" : "")}
          />
        </button>
        {mobileOpen && <div className="px-3 pb-3">{Content}</div>}
      </div>
    </>
  );
}