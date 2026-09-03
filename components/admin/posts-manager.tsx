"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Clock,
  Copy,
  Edit2,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { deletePostAction, duplicatePostAction } from "@/lib/actions/posts";
import { StatusBadge } from "@/components/admin/status-badge";
import type { PostStatus } from "@/db/schema";

export type PostsManagerData = {
  posts: Array<{
    id: string;
    title: string;
    slug: string;
    status: PostStatus;
    excerpt: string;
    category: { id: string; name: string; slug: string } | null;
    tags: Array<{ id: string; name: string; slug: string }>;
    featuredImagePath: string | null;
    publishedAt: string | null;
    updatedAt: string;
    readTimeMinutes: number;
    views: number | null;
  }>;
  viewsAvailable: boolean;
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
};

type SortOption = "newest" | "oldest" | "views" | "title";

const ALL_STATUSES: PostStatus[] = ["published", "draft", "scheduled", "archived"];

function ActionsMenu({
  onEdit,
  onPreview,
  onDuplicate,
  onDelete,
  busy,
}: {
  onEdit: () => void;
  onPreview: (() => void) | null;
  onDuplicate: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        disabled={busy}
        className="p-1.5 rounded-md text-[var(--tx-3)] hover:bg-[var(--bg-muted)] hover:text-[var(--tx-1)] transition-colors disabled:opacity-50"
        aria-label="Post actions"
        aria-expanded={open}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden">
            <button
              type="button"
              onClick={() => {
                onEdit();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--tx-1)] hover:bg-[var(--bg-muted)] transition-colors"
            >
              <Edit2 size={13} className="text-[var(--tx-3)]" /> Edit
            </button>
            {onPreview && (
              <button
                type="button"
                onClick={() => {
                  onPreview();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--tx-1)] hover:bg-[var(--bg-muted)] transition-colors"
              >
                <Eye size={13} className="text-[var(--tx-3)]" /> Preview
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onDuplicate();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--tx-1)] hover:bg-[var(--bg-muted)] transition-colors"
            >
              <Copy size={13} className="text-[var(--tx-3)]" /> Duplicate
            </button>
            <div className="border-t border-[var(--border)]" />
            <button
              type="button"
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function PostsManager({ initial }: { initial: PostsManagerData }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");
  const [sort, setSort] = useState<SortOption>(initial.viewsAvailable ? "views" : "newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortLabel: Record<SortOption, string> = {
    newest: "Newest first",
    oldest: "Oldest first",
    views: "Most views",
    title: "Title A–Z",
  };

  const sortOptions: SortOption[] = initial.viewsAvailable
    ? ["newest", "oldest", "views", "title"]
    : ["newest", "oldest", "title"];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = initial.posts.filter((p) => {
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesQuery =
        q === "" ||
        p.title.toLowerCase().includes(q) ||
        (p.category?.name.toLowerCase().includes(q) ?? false) ||
        p.tags.some((t) => t.name.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
    return [...list].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "oldest") return dateValue(a).localeCompare(dateValue(b));
      if (sort === "views") return (a.views ?? 0) - (b.views ?? 0);
      return dateValue(b).localeCompare(dateValue(a));
    });
  }, [initial.posts, query, statusFilter, sort]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: initial.posts.length };
    for (const s of ALL_STATUSES) out[s] = initial.posts.filter((p) => p.status === s).length;
    return out;
  }, [initial.posts]);

  function dateValue(p: { publishedAt: string | null; updatedAt: string }) {
    return p.publishedAt ?? p.updatedAt;
  }

  async function run(label: string, fn: () => Promise<{ ok: boolean; error?: string }>, id: string) {
    setBusyId(id);
    setError(null);
    const res = await fn();
    setBusyId(null);
    if (!res.ok) {
      setError(res.error ?? `Action failed: ${label}.`);
      return;
    }
    router.refresh();
  }

  const duplicate = (id: string) => run("duplicate", () => duplicatePostAction(id), id);
  const deletePost = async (id: string) => {
    if (!window.confirm("Delete this post permanently? This cannot be undone.")) return;
    await run("delete", () => deletePostAction(id), id);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--tx-1)]">Posts</h1>
          <p className="text-sm text-[var(--tx-3)] mt-1">{initial.posts.length} total posts</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-h)] transition-colors"
        >
          <Plus size={16} /> New post
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts…"
            aria-label="Search posts"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSortMenu((v) => !v)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-2)] hover:bg-[var(--bg-muted)] transition-colors"
            aria-haspopup="menu"
            aria-expanded={showSortMenu}
          >
            {sortLabel[sort]} <ChevronDown size={14} className="text-[var(--tx-3)]" />
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden">
                {sortOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setSort(opt);
                      setShowSortMenu(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-sm transition-colors",
                      sort === opt
                        ? "text-[var(--accent)] bg-[var(--accent-muted)]"
                        : "text-[var(--tx-1)] hover:bg-[var(--bg-muted)]"
                    )}
                  >
                    {sortLabel[opt]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {(["all", ...ALL_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              statusFilter === s
                ? "bg-[var(--tx-1)] text-[var(--bg)]"
                : "text-[var(--tx-3)] hover:bg-[var(--bg-muted)] hover:text-[var(--tx-1)]"
            )}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                statusFilter === s ? "bg-white/20" : "bg-[var(--bg-muted)]"
              )}
            >
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Posts table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[var(--tx-2)] font-medium">No posts found</p>
            <p className="text-sm text-[var(--tx-3)] mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-muted)]/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--tx-3)] uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--tx-3)] uppercase tracking-wide hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--tx-3)] uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--tx-3)] uppercase tracking-wide hidden lg:table-cell">Read time</th>
                {initial.viewsAvailable && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-[var(--tx-3)] uppercase tracking-wide hidden lg:table-cell">Views</th>
                )}
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-[var(--bg-muted)] transition-colors cursor-pointer group"
                  onClick={() => router.push(`/admin/posts/${p.id}`)}
                >
                  <td className="px-4 py-3.5">
                    <div className="text-sm font-medium text-[var(--tx-1)] line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
                      {p.title}
                    </div>
                    <div className="text-xs text-[var(--tx-3)] mt-0.5 flex items-center gap-1.5">
                      <span>{p.category?.name ?? "Uncategorized"}</span>
                      <span className="sm:hidden">
                        <StatusBadge status={p.status} />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell text-xs text-[var(--tx-3)]">
                    {p.publishedAt ? (
                      formatDate(p.publishedAt)
                    ) : p.status === "scheduled" ? (
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {p.updatedAt ? formatDate(p.updatedAt) : "No date"}
                      </span>
                    ) : (
                      <span>Last updated {formatDate(p.updatedAt)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right hidden lg:table-cell text-xs text-[var(--tx-3)]">
                    {p.readTimeMinutes} min
                  </td>
                  {initial.viewsAvailable && (
                    <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                      {p.views !== null ? (
                        <span className="text-xs text-[var(--tx-3)]">{p.views.toLocaleString()}</span>
                      ) : (
                        <span className="text-xs text-[var(--tx-3)]">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <ActionsMenu
                      busy={busyId === p.id}
                      onEdit={() => router.push(`/admin/posts/${p.id}`)}
                      onPreview={p.status === "published" ? () => router.push(`/blog/${p.slug}`) : null}
                      onDuplicate={() => duplicate(p.id)}
                      onDelete={() => deletePost(p.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-xs text-[var(--tx-3)]">
        {filtered.length} of {initial.posts.length} posts
      </p>
    </div>
  );
}