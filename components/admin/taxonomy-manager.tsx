"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { createCategoryAction, createTagAction, deleteCategoryAction, deleteTagAction, updateCategoryAction, updateTagAction } from "@/lib/actions/taxonomy";
import { cn } from "@/lib/utils";

type Row = { id: string; name: string; slug: string; description: string | null };

function ListBlock({
  title,
  rows,
  kind,
  multicolor,
}: {
  title: string;
  rows: Row[];
  kind: "category" | "tag";
  multicolor?: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Action failed.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function addSubmit() {
    const name = newName.trim();
    if (!name) return;
    if (kind === "category") {
      const ok = await run(() => createCategoryAction({ name, description: newDesc.trim() || null }));
      if (ok) {
        setNewName("");
        setNewDesc("");
        setAdding(false);
      }
    } else {
      const ok = await run(() => createTagAction(name));
      if (ok) {
        setNewName("");
        setAdding(false);
      }
    }
  }

  async function deleteById(id: string) {
    if (!window.confirm(`Delete ${kind} "${rows.find((r) => r.id === id)?.name}"? Posts and tags will be unlinked.`)) return;
    setPendingId(id);
    await run(() => (kind === "category" ? deleteCategoryAction(id) : deleteTagAction(id)));
    setPendingId(null);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--tx-1)]">
          {title} <span className="text-[var(--tx-3)] font-normal">({rows.length})</span>
        </h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--tx-2)] hover:text-[var(--tx-1)] transition-colors"
        >
          {adding ? <X size={13} /> : <Plus size={13} />}
          {adding ? "Cancel" : `New ${kind}`}
        </button>
      </div>

      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void addSubmit();
          }}
          className="px-5 py-3 border-b border-[var(--border)] bg-neutral-50 dark:bg-neutral-900/30 space-y-2"
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`${kind} name`}
            aria-label={`New ${kind} name`}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
          />
          {kind === "category" && (
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              aria-label="Category description"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
            />
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-h)] text-white px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Add
            </button>
          </div>
        </form>
      )}

      {error && <p className="px-5 pt-3 text-xs text-red-500" role="alert">{error}</p>}

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-[var(--tx-3)] text-center">
          No {kind === "category" ? "categories" : "tags"} yet.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <li key={row.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
              {editId === row.id ? (
                <form
                  className="flex-1 flex flex-wrap items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = editName.trim();
                    if (!name) return;
                    void run(() =>
                      kind === "category"
                        ? updateCategoryAction({ id: row.id, name, description: editDesc.trim() || null })
                        : updateTagAction({ id: row.id, name })
                    ).then((ok) => {
                      if (ok) setEditId(null);
                    });
                  }}
                >
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 min-w-32 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-1)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  />
                  {kind === "category" && (
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="flex-1 min-w-32 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-1)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  )}
                  <button disabled={busy} className="p-1.5 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" aria-label="Save">
                    <Check size={15} />
                  </button>
                  <button onClick={() => setEditId(null)} className="p-1.5 rounded-md text-[var(--tx-3)] hover:bg-neutral-100 dark:hover:bg-neutral-900/40 transition-colors" aria-label="Cancel">
                    <X size={15} />
                  </button>
                </form>
              ) : (
                <>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        multicolor && "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400"
                      )}
                    >
                      {row.name}
                    </span>
                    <span className="truncate text-xs text-[var(--tx-3)]">/{row.slug}</span>
                    {row.description && <span className="truncate text-xs text-[var(--tx-3)] hidden sm:inline">· {row.description}</span>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditId(row.id);
                        setEditName(row.name);
                        setEditDesc(row.description ?? "");
                      }}
                      className="p-1.5 rounded-md text-[var(--tx-3)] hover:bg-neutral-100 dark:hover:bg-neutral-900/40 hover:text-[var(--tx-1)] transition-colors"
                      aria-label={`Rename ${row.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => void deleteById(row.id)}
                      disabled={pendingId === row.id}
                      className="p-1.5 rounded-md text-[var(--tx-3)] hover:bg-neutral-100 dark:hover:bg-neutral-900/40 hover:text-red-500 transition-colors disabled:opacity-50"
                      aria-label={`Delete ${row.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TaxonomyManager({
  categories,
  tags,
}: {
  categories: Row[];
  tags: Row[];
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <ListBlock title="Categories" rows={categories} kind="category" multicolor={false} />
      <ListBlock title="Tags" rows={tags} kind="tag" multicolor />
    </div>
  );
}