"use client";

import { Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";

import { THEME_COOKIE, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ theme, className }: { theme: Theme; className?: string }) {
  const router = useRouter();

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "p-2 rounded-md text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-muted)] transition-colors focus-ring",
        className
      )}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}