"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import { deleteMediaAction, listMediaAction, uploadMediaAction } from "@/lib/actions/media";
import type { MediaDto } from "@/lib/actions/types";
import { formatDate } from "@/lib/format";

export function MediaLibrary() {
  const router = useRouter();
  const [items, setItems] = useState<MediaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [alt, setAlt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

async function refresh() {
    setError(null);
    const res = await listMediaAction({ limit: 200, offset: 0 });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.data) setItems(res.data);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    if (alt.trim()) fd.append("alt", alt.trim());
    const res = await uploadMediaAction(fd);
    setUploading(false);
    setAlt("");
    if (res.ok) {
      await refresh();
    } else {
      setError(res.error);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this media item? Posts referencing it will show a broken image.")) return;
    setBusyId(id);
    setError(null);
    const res = await deleteMediaAction(id);
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await refresh();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-4 py-2.5 text-sm text-[var(--tx-2)] cursor-pointer hover:border-[var(--accent)]/60 transition-colors">
          <UploadCloud size={15} />
          {uploading ? "Uploading…" : "Upload image"}
          <input type="file" accept="image/*" disabled={uploading} onChange={handleFile} className="hidden" />
        </label>
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Alt text (optional)"
          aria-label="Alt text"
          className="flex-1 min-w-40 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
        />
        <p className="text-xs text-[var(--tx-3)]">{items.length} item{items.length === 1 ? "" : "s"}</p>
      </div>

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] py-16 text-center flex items-center justify-center gap-2 text-sm text-[var(--tx-3)]">
          <Loader2 size={15} className="animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] py-16 text-center">
          <p className="text-sm text-[var(--tx-3)]">No media yet. Upload an image above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((m) => (
            <div key={m.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="relative group">
                {m.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.urlPath} alt={m.altText ?? ""} className="w-full aspect-video object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-[8.4rem] bg-neutral-100 dark:bg-neutral-900/40 text-[var(--tx-3)] text-xs">
                    Non-image file
                  </div>
                )}
                <button
                  onClick={() => void remove(m.id)}
                  disabled={busyId === m.id}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
                  aria-label="Delete media"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="px-3 py-2 space-y-0.5">
                <p className="text-xs text-[var(--tx-1)] truncate" title={m.urlPath}>{m.urlPath.split("/").pop()}</p>
                <p className="text-[11px] text-[var(--tx-3)] truncate">
                  {formatDate(m.createdAt)}
                  {m.width && m.height ? ` · ${m.width}×${m.height}` : ""}
                  {m.altText ? ` · ${m.altText}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}