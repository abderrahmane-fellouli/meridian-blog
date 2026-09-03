"use client";

import { useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { saveSettingsAction } from "@/lib/actions/settings";
import type { SiteSettings } from "@/lib/services/settings";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [form, setForm] = useState<SiteSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setNotice(null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    const res = await saveSettingsAction(form);
    setSaving(false);
    if (res.ok) setNotice({ kind: "ok", text: `Saved at ${new Date().toLocaleTimeString()}.` });
    else setNotice({ kind: "error", text: res.error ?? "Failed to save settings." });
  }

  const input =
    "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Section title="Identity">
        <Field label="Site name">
          <input className={input} value={form.siteName} onChange={(e) => set("siteName", e.target.value)} />
        </Field>
        <Field label="Tagline">
          <input className={input} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field label="Footer tagline">
          <input className={input} value={form.footerTagline} onChange={(e) => set("footerTagline", e.target.value)} />
        </Field>
        <Field label="Description (SEO)">
          <textarea className={input} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </Section>

      <Section title="Author">
        <Field label="Name">
          <input className={input} value={form.authorName} onChange={(e) => set("authorName", e.target.value)} />
        </Field>
        <Field label="Role">
          <input className={input} value={form.authorRole} onChange={(e) => set("authorRole", e.target.value)} />
        </Field>
        <Field label="Bio">
          <textarea className={input} rows={3} value={form.authorBio} onChange={(e) => set("authorBio", e.target.value)} />
        </Field>
        <Field label="Contact email">
          <input type="email" className={input} value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
        </Field>
      </Section>

      <Section title="Social links">
        <p className="text-xs text-[var(--tx-3)] -mt-1">Shown in the site footer.</p>
        {form.socialLinks.length === 0 && (
          <p className="text-sm text-[var(--tx-3)]">No social links yet.</p>
        )}
        {form.socialLinks.map((link, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              className={input}
              placeholder="Label (e.g. GitHub)"
              value={link.label}
              onChange={(e) => {
                const next = [...form.socialLinks];
                next[idx] = { ...next[idx], label: e.target.value };
                set("socialLinks", next);
              }}
            />
            <input
              className={input}
              placeholder="https://…"
              value={link.url}
              onChange={(e) => {
                const next = [...form.socialLinks];
                next[idx] = { ...next[idx], url: e.target.value };
                set("socialLinks", next);
              }}
            />
            <button
              type="button"
              onClick={() => set("socialLinks", form.socialLinks.filter((_, i) => i !== idx))}
              className="p-2 rounded-lg border border-[var(--border)] text-[var(--tx-3)] hover:text-red-500 transition-colors"
              aria-label="Remove link"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set("socialLinks", [...form.socialLinks, { label: "", url: "" }])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--tx-2)] hover:text-[var(--tx-1)] transition-colors"
        >
          <Plus size={13} /> Add social link
        </button>
      </Section>

      <Section title="SEO">
        <Field label="Default OpenGraph image path">
          <input className={input} value={form.defaultOgImagePath ?? ""} onChange={(e) => set("defaultOgImagePath", e.target.value || null)} placeholder="/media/… .png" />
        </Field>
      </Section>

      {notice && (
        <p className={notice.kind === "ok" ? "text-sm text-green-600 dark:text-green-400" : "text-sm text-red-500"} role="status">
          {notice.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-h)] text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        Save settings
      </button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
      <legend className="px-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--tx-3)]">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--tx-2)] mb-1.5">{label}</span>
      {children}
    </label>
  );
}