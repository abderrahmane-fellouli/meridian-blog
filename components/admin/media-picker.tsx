"use client";

import { useEffect, useState } from "react";
import { Search, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadMediaAction, listMediaAction } from "@/lib/actions/media";
import type { MediaDto } from "@/lib/actions/types";
import { formatDate } from "@/lib/format";

export function MediaPickerDialog({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (media: MediaDto) => void;
}) {
  const [items, setItems] = useState<MediaDto[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAlt, setUploadingAlt] = useState("");
  const [error, setError] = useState<string | null>(null);

const refresh = async () => {
    setLoading(true);
    const res = await listMediaAction({ limit: 60, offset: 0 });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.data) setItems(res.data);
  };

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        setError(null);
        void refresh();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = query.trim()
    ? items.filter((m) => m.urlPath.toLowerCase().includes(query.trim().toLowerCase()) || (m.altText ?? "").toLowerCase().includes(query.trim().toLowerCase()))
    : items;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    if (uploadingAlt.trim()) fd.append("alt", uploadingAlt.trim());
    const res = await uploadMediaAction(fd);
    setUploading(false);
    setUploadingAlt("");
    if (res.ok) {
      await refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-label="Choose media">
      <div className="w-full max-w-2xl bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--tx-1)]">Choose media</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-md text-[var(--tx-3)] hover:bg-neutral-100 dark:hover:bg-neutral-900/40 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[var(--border)] space-y-2.5">
          <label className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--border)] px-3 py-3 cursor-pointer hover:border-[var(--accent)]/60 transition-colors">
            <UploadCloud size={18} className="text-[var(--tx-3)] shrink-0" />
            <span className="text-sm text-[var(--tx-2)] flex-1">
              {uploading ? "Uploading…" : "Upload an image"}
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={handleFile}
              className="hidden"
            />
          </label>
          <input
            value={uploadingAlt}
            onChange={(e) => setUploadingAlt(e.target.value)}
            placeholder="Alt text for upload (optional)"
            aria-label="Alt text"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
          />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tx-3)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by filename or alt text…"
              aria-label="Filter media"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
            />
          </div>
        </div>

        {error && (
          <p className="px-5 pt-3 text-xs text-red-500" role="alert">
            {error}
          </p>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-[var(--tx-3)] text-center py-10">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[var(--tx-3)] text-center py-10">
              {query.trim() ? "No media matches." : "No media yet. Upload an image above."}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onPick(m)}
                  className={cn(
                    "group rounded-lg overflow-hidden border border-[var(--border)] hover:border-[var(--accent)]/60 transition-colors text-left",
                    !m.mimeType.startsWith("image/") && "all:flex"
                  )}
                  title={m.altText ?? m.urlPath}
                >
                  {m.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.urlPath}
                      alt={m.altText ?? ""}
                      className="w-full aspect-video object-cover group-hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[7rem] bg-neutral-100 dark:bg-neutral-900/40 text-[var(--tx-3)]">
                      <span className="text-xs">File</span>
                    </div>
                  )}
                  <div className="px-2 py-1.5">
                    <p className="text-[11px] text-[var(--tx-2)] truncate">{m.urlPath.split("/").pop()}</p>
                    <p className="text-[10px] text-[var(--tx-3)]">{formatDate(m.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}