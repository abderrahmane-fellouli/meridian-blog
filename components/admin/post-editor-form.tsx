"use client";

import { createElement, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Eye,
  Hash,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Send,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/slug";
import { EMPTY_BODY, type BodyDoc } from "@/lib/body";
import { createPostAction, updatePostAction } from "@/lib/actions/posts";
import type { TiptapEditorHandle } from "@/components/admin/tiptap-editor";
import { EditorToolbar } from "@/components/admin/editor-toolbar";
import { MediaPickerDialog } from "@/components/admin/media-picker";
import type { MediaDto } from "@/lib/actions/types";
import type { PostStatus } from "@/db/schema";
import type { Editor } from "@tiptap/react";

export type CategoryOption = { id: string; name: string; slug: string };
export type TagOption = { id: string; name: string; slug: string };

const TiptapEditor = dynamic(
  () => import("@/components/admin/tiptap-editor").then((m) => m.TiptapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] min-h-[24rem] flex items-center justify-center text-sm text-[var(--tx-3)]">
        Loading editor…
      </div>
    ),
  }
) as typeof import("@/components/admin/tiptap-editor").TiptapEditor;

export type EditorInitialPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  bodyJson: BodyDoc;
  status: PostStatus;
  categoryId: string | null;
  tagIds: string[];
  featuredImagePath: string | null;
  featuredImageAlt: string | null;
  featured: boolean;
  affiliateDisclosure: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  ogImagePath: string | null;
  noindex: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function SidebarSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)] hover:text-[var(--tx-2)] transition-colors"
      >
        {title}
        <ChevronDown size={13} className={cn("transition-transform", open ? "rotate-180" : "")} />
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function Toggle({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-[var(--tx-2)]">{label}</label>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0",
          checked ? "bg-[var(--accent)]" : "bg-[var(--border)]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform shadow-sm",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

function TagSelector({
  allTags,
  selected,
  onToggle,
}: {
  allTags: TagOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = allTags.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--tx-2)] uppercase tracking-wide">Tags</label>
      <div className="flex flex-wrap gap-1.5">
        {selected.length === 0 && <span className="text-xs text-[var(--tx-3)]">No tags selected.</span>}
        {selected.map((id) => {
          const tag = allTags.find((t) => t.id === id);
          if (!tag) return null;
          return (
            <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent)] text-xs">
              #{tag.name}
              <button type="button" onClick={() => onToggle(id)} aria-label={`Remove ${tag.name}`} className="hover:text-red-500 transition-colors">
                <X size={10} />
              </button>
            </span>
          );
        })}
      </div>
      <div className="relative">
        <Hash size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add tag…"
          aria-label="Search tags"
          className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
        />
      </div>
      {query && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden max-h-32 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--tx-3)]">No matching tags.</p>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onToggle(t.id);
                  setQuery("");
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs transition-colors",
                  selected.includes(t.id)
                    ? "text-[var(--accent)] bg-[var(--accent-muted)]"
                    : "text-[var(--tx-1)] hover:bg-[var(--bg-muted)]"
                )}
              >
                #{t.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors";

const fieldLabel = "text-xs font-medium text-[var(--tx-2)]";

export function PostEditorForm({
  categories,
  tags,
  initial,
}: {
  categories: CategoryOption[];
  tags: TagOption[];
  initial: EditorInitialPost | null;
}) {
  const router = useRouter();
  const [savedId, setSavedId] = useState<string | null>(initial?.id ?? null);
  const [lastServerAt, setLastServerAt] = useState<string | null>(initial?.updatedAt ?? null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? "");
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? []);
  const [featuredImagePath, setFeaturedImagePath] = useState<string | null>(initial?.featuredImagePath ?? null);
  const [featuredImageAlt, setFeaturedImageAlt] = useState<string>(initial?.featuredImageAlt ?? "");
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [affiliateDisclosure, setAffiliateDisclosure] = useState(initial?.affiliateDisclosure ?? false);
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(initial?.canonicalUrl ?? "");
  const [ogImagePath, setOgImagePath] = useState(initial?.ogImagePath ?? "");
  const [noindex, setNoindex] = useState(initial?.noindex ?? false);
  const [status, setStatus] = useState<PostStatus>(initial?.status ?? "draft");
  const [publishedAt, setPublishedAt] = useState<string>(
    initial?.publishedAt ?? (initial?.status === "published" ? toLocalInput(new Date()) : "")
  );
  const [body, setBody] = useState<BodyDoc>(initial?.bodyJson ?? EMPTY_BODY);

  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "conflict">("idle");
  const [error, setError] = useState<string | null>(null);
  const [conflictDetail, setConflictDetail] = useState<string | null>(null);

  const [pickerFor, setPickerFor] = useState<"featured" | "body" | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const editorRef = useRef<TiptapEditorHandle | null>(null);

  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildPatch(overrides: { status: PostStatus; publishedAt: string | null } = { status, publishedAt }) {
    return {
      title,
      excerpt: excerpt.trim() || null,
      bodyJson: body,
      slug: slug || null,
      categoryId: categoryId || null,
      tagIds,
      featuredImagePath,
      featuredImageAlt: featuredImageAlt.trim() || null,
      featured,
      affiliateDisclosure,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
      canonicalUrl: canonicalUrl.trim() || null,
      ogImagePath: ogImagePath.trim() || null,
      noindex,
      status: overrides.status,
      publishedAt: overrides.publishedAt,
    };
  }

  const markDirty = useCallback(() => {
    setDirty(true);
    dirtyRef.current = true;
  }, []);

  async function persist(overrides: { status: PostStatus; publishedAt: string | null }) {
    if (saveState === "saving") return false;
    setError(null);
    setConflictDetail(null);
    if (!title.trim()) {
      setError("A title is required before saving.");
      return false;
    }
    if (overrides.status === "published" && !overrides.publishedAt) {
      setError("Pick a publish date or switch to Draft first.");
      return false;
    }
    setSaveState("saving");
    const patch = buildPatch(overrides);
    if (savedId && lastServerAt) {
      const res = await updatePostAction(savedId, patch, lastServerAt);
      if (!res.ok) {
        if (res.conflict) {
          setSaveState("conflict");
          setConflictDetail(res.error);
          return false;
        }
        setSaveState("error");
        setError(res.error);
        return false;
      }
      setSavedId(res.post.id);
      setLastServerAt(res.post.updatedAt);
      setSaveState("saved");
      setDirty(false);
      dirtyRef.current = false;
      return true;
    }
    const res = await createPostAction({ ...patch, status: overrides.status, publishedAt: overrides.publishedAt });
    if (!res.ok) {
      setSaveState("error");
      setError(res.error);
      return false;
    }
    if (!res.data) {
      setSaveState("error");
      setError("The server returned an empty response.");
      return false;
    }
    setSavedId(res.data.id);
    setLastServerAt(res.data.updatedAt);
    setSaveState("saved");
    setDirty(false);
    dirtyRef.current = false;
    router.replace(`/admin/posts/${res.data.id}`, { scroll: false });
    return true;
  }

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void persist({ status, publishedAt });
    }, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist intentionally captures the latest snapshot per render
  }, [title, slug, excerpt, body, categoryId, tagIds, featuredImagePath, featuredImageAlt, featured, affiliateDisclosure, seoTitle, seoDescription, canonicalUrl, ogImagePath, noindex, status, publishedAt, savedId, lastServerAt, saveState, persist]);

  useEffect(() => {
    if (dirty) scheduleSave();
  }, [dirty, scheduleSave]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    function onSaveShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void persist({ status, publishedAt });
      }
    }
    window.addEventListener("keydown", onSaveShortcut);
    return () => window.removeEventListener("keydown", onSaveShortcut);
  });

  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, []);

  function onTitleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setTitle(next);
    if (!slugTouched) setSlug(slugify(next));
    markDirty();
  }

  function reloadLatest() {
    router.refresh();
  }

  function clearFeatured() {
    setFeaturedImagePath(null);
    setFeaturedImageAlt("");
    markDirty();
  }

  function picked(media: MediaDto) {
    if (pickerFor === "featured") {
      setFeaturedImagePath(media.urlPath);
      setFeaturedImageAlt(media.altText ?? "");
    } else if (pickerFor === "body") {
      editorRef.current?.insertImage(media.urlPath, media.altText ?? media.urlPath.split("/").pop() ?? "");
    }
    markDirty();
    setPickerFor(null);
  }

  const toggleTag = (id: string) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
    markDirty();
  };

  const primaryLabel = status === "published" ? "Update" : status === "scheduled" ? "Schedule" : "Publish";
  const primaryIcon: LucideIcon = status === "published" ? Save : status === "scheduled" ? Clock : Send;

  const saveIndicator = useMemo(() => {
    if (saveState === "saving") return { label: "Saving…", cls: "text-[var(--tx-3)]", icon: <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> };
    if (saveState === "error") return { label: "Save failed", cls: "text-red-500", icon: <AlertCircle size={13} /> };
    if (saveState === "conflict") return { label: "Save conflict", cls: "text-orange-500", icon: <RefreshCw size={13} /> };
    if (dirty) return { label: "Unsaved changes", cls: "text-amber-600 dark:text-amber-400", icon: <AlertCircle size={13} /> };
    if (savedId) return { label: "Saved", cls: "text-emerald-600 dark:text-emerald-400", icon: <Check size={13} /> };
    return { label: "Not saved yet", cls: "text-[var(--tx-3)]", icon: <AlertCircle size={13} /> };
  }, [saveState, dirty, savedId]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Editor topbar */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 h-14 border-b border-[var(--border)] bg-[var(--bg)] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/admin/posts"
            className="p-2 -ml-2 rounded-md text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-muted)] transition-colors"
            aria-label="Back to posts"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className={cn("flex items-center gap-1.5 text-xs font-medium", saveIndicator.cls)}>
            {saveIndicator.icon}
            <span className="hidden sm:inline">{saveIndicator.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => savedId && router.push(`/admin/preview/${savedId}`)}
            disabled={!savedId}
            title={savedId ? "Open live preview" : "Save first to preview"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--tx-2)] hover:bg-[var(--bg-muted)] hover:text-[var(--tx-1)] transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <Eye size={14} />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            type="button"
            disabled={saveState === "saving"}
            onClick={() => void persist(
              status === "scheduled"
                ? { status: "scheduled", publishedAt: publishedAt || toLocalInput(new Date()) }
                : { status: "published", publishedAt: publishedAt || toLocalInput(new Date()) }
            )}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-h)] text-white px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {createElement(primaryIcon, { size: 14 })}
            {primaryLabel}
          </button>
        </div>
      </div>

      {(error || saveState === "conflict") && (
        <div className="px-4 sm:px-6 py-3 border-b border-[var(--border)] bg-[var(--bg)]">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center justify-between gap-2" role="alert">
              <span>{error}</span>
              {saveState === "error" && (
                <button onClick={() => void persist({ status, publishedAt })} className="underline shrink-0">
                  Retry
                </button>
              )}
            </div>
          )}
          {saveState === "conflict" && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20 px-4 py-3 text-sm text-orange-700 dark:text-orange-400" role="alert">
              <div className="flex items-center justify-between gap-2">
                <span>{conflictDetail ?? "This post was changed elsewhere. Your draft was not overwritten."}</span>
                <button onClick={reloadLatest} className="inline-flex items-center gap-1.5 underline shrink-0">
                  <RefreshCw size={13} /> Reload latest
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main editor area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Editor column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <EditorToolbar api={editorRef} editor={editor} onImage={() => setPickerFor("body")} />

          <div className="flex-1 px-6 sm:px-10 lg:px-16 py-8 max-w-[760px] mx-auto w-full">
            <textarea
              value={title}
              onChange={onTitleChange}
              placeholder="Article title"
              rows={2}
              aria-label="Title"
              className="w-full resize-none bg-transparent border-none outline-none text-3xl sm:text-4xl font-semibold text-[var(--tx-1)] placeholder:text-[var(--tx-3)] leading-tight mb-6 font-display"
              style={{ fontFamily: "var(--font-display)" }}
            />
            <textarea
              value={excerpt}
              onChange={(e) => { setExcerpt(e.target.value); markDirty(); }}
              placeholder="Article excerpt / lede (appears below the title and in cards)"
              rows={2}
              aria-label="Excerpt"
              className="w-full resize-none bg-transparent border-none outline-none text-lg text-[var(--tx-2)] placeholder:text-[var(--tx-3)] leading-relaxed mb-8 border-b border-[var(--border)] pb-6"
            />
            <TiptapEditor
              ref={editorRef}
              value={body}
              onChange={(b) => { setBody(b); markDirty(); }}
              onReady={(ed) => setEditor(ed)}
              placeholder="Start writing your article…"
            />
          </div>
        </div>

        {/* Metadata sidebar */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 border-l border-[var(--border)] bg-[var(--bg)] overflow-y-auto shrink-0">
          <SidebarSection title="Status">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as PostStatus); markDirty(); }}
              className={inputCls}
              aria-label="Status"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            {status !== "archived" && (
              <div>
                <label className={cn(fieldLabel, "block mb-1")}>Publish / schedule date <span className="text-[var(--tx-3)]">(local)</span></label>
                <input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => { setPublishedAt(e.target.value); markDirty(); }}
                  className={inputCls}
                  aria-label="Publish or schedule date"
                />
              </div>
            )}
            <Toggle checked={featured} onToggle={() => { setFeatured((v) => !v); markDirty(); }} label="Featured post" />
            <Toggle checked={affiliateDisclosure} onToggle={() => { setAffiliateDisclosure((v) => !v); markDirty(); }} label="Affiliate content" />
          </SidebarSection>

          <SidebarSection title="Details">
            <div>
              <label className={cn(fieldLabel, "block mb-1")}>URL Slug</label>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); markDirty(); }}
                onBlur={() => { if (slug.trim()) setSlug(slugify(slug)); }}
                placeholder="post-url-slug"
                aria-label="URL slug"
                className={inputCls}
              />
              {slug && <p className="mt-1 text-xs text-[var(--tx-3)]">/blog/{slug}</p>}
            </div>
            <div>
              <label className={cn(fieldLabel, "block mb-1")}>Category</label>
              <select
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); markDirty(); }}
                className={inputCls}
                aria-label="Category"
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <TagSelector allTags={tags} selected={tagIds} onToggle={toggleTag} />
          </SidebarSection>

          <SidebarSection title="Featured image">
            {featuredImagePath ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={featuredImagePath} alt={featuredImageAlt} className="w-full aspect-video object-cover" />
                  <button
                    type="button"
                    onClick={clearFeatured}
                    aria-label="Remove featured image"
                    className="absolute top-2 right-2 size-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                <input
                  value={featuredImageAlt}
                  onChange={(e) => { setFeaturedImageAlt(e.target.value); markDirty(); }}
                  placeholder="Alt text"
                  aria-label="Featured image alt text"
                  className={cn(inputCls, "text-xs")}
                />
                <button
                  type="button"
                  onClick={() => setPickerFor("featured")}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--tx-2)] hover:text-[var(--tx-1)] transition-colors"
                >
                  <ImageIcon size={13} /> Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPickerFor("featured")}
                className="w-full flex flex-col items-center gap-2 py-6 rounded-lg border-2 border-dashed border-[var(--border)] text-[var(--tx-3)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition-colors"
              >
                <Upload size={18} />
                <span className="text-xs">Upload or choose image</span>
              </button>
            )}
          </SidebarSection>

          <SidebarSection title="SEO" defaultOpen={false}>
            <div>
              <label className={cn(fieldLabel, "block mb-1")}>SEO Title</label>
              <input
                value={seoTitle}
                onChange={(e) => { setSeoTitle(e.target.value); markDirty(); }}
                placeholder={title || "Article title"}
                aria-label="SEO title"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-[var(--tx-3)]">{(seoTitle || title).length}/60 characters</p>
            </div>
            <div>
              <label className={cn(fieldLabel, "block mb-1")}>Meta Description</label>
              <textarea
                value={seoDescription}
                onChange={(e) => { setSeoDescription(e.target.value); markDirty(); }}
                placeholder={excerpt || "Article excerpt…"}
                rows={3}
                aria-label="Meta description"
                className={cn(inputCls, "resize-y")}
              />
              <p className="mt-1 text-xs text-[var(--tx-3)]">{(seoDescription || excerpt).length}/160 characters</p>
            </div>
            <div>
              <label className={cn(fieldLabel, "block mb-1")}>Canonical URL</label>
              <input
                value={canonicalUrl}
                onChange={(e) => { setCanonicalUrl(e.target.value); markDirty(); }}
                placeholder="https://…"
                aria-label="Canonical URL"
                className={inputCls}
              />
            </div>
            <div>
              <label className={cn(fieldLabel, "block mb-1")}>Open Graph image URL</label>
              <input
                value={ogImagePath}
                onChange={(e) => { setOgImagePath(e.target.value); markDirty(); }}
                placeholder="/media/… or https://…"
                aria-label="Open Graph image URL"
                className={inputCls}
              />
            </div>
            <Toggle checked={noindex} onToggle={() => { setNoindex((v) => !v); markDirty(); }} label="Noindex" />
          </SidebarSection>
        </aside>
      </div>

      <MediaPickerDialog open={pickerFor !== null} onClose={() => setPickerFor(null)} onPick={picked} />
    </div>
  );
}