import Link from "next/link";
import { ArrowRight, Calendar, Clock, FileText, Globe, Image as ImageIcon } from "lucide-react";
import { getAdminStats } from "@/lib/services/posts";
import { listCategories, listTags } from "@/lib/services/categories-tags";
import { countMedia } from "@/lib/services/media";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/admin/status-badge";

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-xl border p-5 flex flex-col gap-3 border-[var(--accent)]/30 bg-[var(--accent-muted)]"
          : "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-3"
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--tx-3)] uppercase tracking-wide">{label}</span>
        <span className={accent ? "text-[var(--accent)]" : "text-[var(--tx-3)]"}>{icon}</span>
      </div>
      <div>
        <div className={accent ? "text-3xl font-semibold text-[var(--accent)]" : "text-3xl font-semibold text-[var(--tx-1)]"}>
          {value}
        </div>
        <div className="text-xs text-[var(--tx-3)] mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [stats, categories, tags, mediaCount] = await Promise.all([
    getAdminStats(),
    listCategories(),
    listTags(),
    countMedia(),
  ]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto w-full">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--tx-1)]">Dashboard</h1>
          <p className="text-sm text-[var(--tx-3)] mt-1">{today}</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-h)] transition-colors"
        >
          + New post
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Published" value={stats.publishedVisible} sub="live articles" icon={<Globe size={16} />} accent />
        <StatCard label="Drafts" value={stats.byStatus.draft} sub="in progress" icon={<FileText size={16} />} />
        <StatCard label="Scheduled" value={stats.byStatus.scheduled} sub="queued to publish" icon={<Clock size={16} />} />
      </div>

      {/* Library overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total posts" value={stats.total} sub="all statuses" icon={<FileText size={16} />} />
        <StatCard label="Media" value={mediaCount} sub="uploads" icon={<ImageIcon size={16} />} />
        <StatCard label="Categories" value={categories.length} sub="topics" icon={<Globe size={16} />} />
        <StatCard label="Tags" value={tags.length} sub="labels" icon={<Clock size={16} />} />
      </div>

      {/* Next scheduled banner */}
      {stats.nextScheduled && (
        <div className="mb-8 flex items-center gap-4 p-4 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20">
          <Calendar size={18} className="text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-0.5">Next scheduled publication</p>
            <p className="text-sm font-semibold text-[var(--tx-1)] line-clamp-1">{stats.nextScheduled.title}</p>
            <p className="text-xs text-[var(--tx-3)]">
              {stats.nextScheduled.publishedAt ? formatDate(stats.nextScheduled.publishedAt, "long") : "Date not set"}
            </p>
          </div>
          <Link
            href={`/admin/posts/${stats.nextScheduled.id}`}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
          >
            Edit <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Recently updated posts */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--tx-1)]">Recent posts</h2>
          <Link
            href="/admin/posts"
            className="text-xs text-[var(--accent)] hover:text-[var(--accent-h)] flex items-center gap-1 transition-colors"
          >
            All posts <ArrowRight size={12} />
          </Link>
        </div>

        {stats.recent.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[var(--tx-2)]">No posts yet.</p>
            <Link href="/admin/posts/new" className="text-xs text-[var(--accent)] hover:underline mt-1 inline-block">
              Write your first post
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--tx-3)] uppercase tracking-wide">Title</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--tx-3)] uppercase tracking-wide hidden sm:table-cell">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--tx-3)] uppercase tracking-wide hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {stats.recent.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--bg-muted)] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/posts/${p.id}`}>
                      <span className="text-sm font-medium text-[var(--tx-1)] line-clamp-1 hover:text-[var(--accent)] transition-colors">
                        {p.title}
                      </span>
                    </Link>
                    <div className="text-xs text-[var(--tx-3)] mt-0.5">{p.category?.name ?? "Uncategorized"}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-[var(--tx-3)]">
                    {p.publishedAt
                      ? formatDate(p.publishedAt)
                      : p.status === "scheduled"
                        ? `Scheduled ${p.publishedAt ? formatDate(p.publishedAt) : ""}`
                        : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}