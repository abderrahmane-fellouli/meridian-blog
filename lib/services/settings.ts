import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { setting } from "@/db/schema";
import { site } from "@/lib/site";

export interface SiteSettings {
  siteName: string;
  tagline: string;
  description: string;
  footerTagline: string;
  authorName: string;
  authorRole: string;
  authorBio: string;
  contactEmail: string;
  socialLinks: Array<{ label: string; url: string }>;
  defaultOgImagePath: string | null;
}

export const SETTINGS_KEYS: Record<Exclude<keyof SiteSettings, never>, string> = {
  siteName: "site_name",
  tagline: "site_tagline",
  description: "site_description",
  footerTagline: "site_footer_tagline",
  authorName: "author_name",
  authorRole: "author_role",
  authorBio: "author_bio",
  contactEmail: "contact_email",
  socialLinks: "social_links",
  defaultOgImagePath: "default_og_image",
};

export function defaultSiteSettings(): SiteSettings {
  return {
    siteName: site.name,
    tagline: site.tagline,
    description: site.description,
    footerTagline: site.footerTagline,
    authorName: site.author.name,
    authorRole: site.author.role,
    authorBio: site.author.bio,
    contactEmail: "",
    socialLinks: [],
    defaultOgImagePath: null,
  };
}

const DB_KEY_TO_PROP: Record<string, keyof SiteSettings> = Object.fromEntries(
  Object.entries(SETTINGS_KEYS).map(([prop, dbKey]) => [dbKey, prop as keyof SiteSettings])
);

/** Pure merge: row over default, with per-field normalization/fallback. */
export function mergeSettingsStored(stored: Record<string, unknown>): SiteSettings {
  const out: SiteSettings = defaultSiteSettings();
  for (const [dbKey, value] of Object.entries(stored)) {
    const prop = DB_KEY_TO_PROP[dbKey];
    if (!prop || value === null || value === undefined) continue;
    switch (prop) {
      case "siteName":
      case "tagline":
      case "description":
      case "footerTagline":
      case "authorName":
      case "authorRole":
      case "authorBio":
      case "contactEmail": {
        const text = String(value).trim();
        if (text) out[prop] = text;
        break;
      }
      case "socialLinks": {
        if (Array.isArray(value)) {
          const links = (value as Array<{ label?: unknown; url?: unknown }>)
            .filter((v) => v && typeof v === "object" && typeof v.url === "string")
            .map((v) => ({ label: String(v.label ?? "").trim(), url: String(v.url).trim() }))
            .filter((v) => v.url.length > 0);
          out.socialLinks = links;
        }
        break;
      }
      case "defaultOgImagePath": {
        const text = String(value).trim();
        out.defaultOgImagePath = text || null;
        break;
      }
    }
  }
  return out;
}

/** Load site settings from the DB, falling back to defaults per field. */
export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.select({ key: setting.key, value: setting.value }).from(setting);
  const stored: Record<string, unknown> = {};
  for (const row of rows) stored[row.key] = row.value;
  return mergeSettingsStored(stored);
}

function normalizeSettingValue(prop: keyof SiteSettings, value: unknown): unknown {
  if (prop === "socialLinks") {
    if (!Array.isArray(value)) return [];
    return (value as Array<{ label?: unknown; url?: unknown }>)
      .filter((v) => v && typeof v === "object" && typeof v.url === "string")
      .map((v) => ({ label: String(v.label ?? "").trim(), url: String(v.url).trim() }))
      .filter((v) => v.url.length > 0);
  }
  if (prop === "defaultOgImagePath") {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }
  return typeof value === "string" ? value.trim() : "";
}

/** Upsert a partial settings patch; returns the merged result. */
export async function updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const entries: Array<{ key: string; value: unknown }> = [];
  for (const [propRaw, value] of Object.entries(patch)) {
    const prop = propRaw as keyof SiteSettings;
    const dbKey = SETTINGS_KEYS[prop];
    if (!dbKey || value === undefined) continue;
    entries.push({ key: dbKey, value: normalizeSettingValue(prop, value) });
  }
  if (entries.length > 0) {
    await db
      .insert(setting)
      .values(entries)
      .onConflictDoUpdate({
        target: setting.key,
        set: { value: sql`excluded.value`, updatedAt: new Date() },
      });
  }
  return getSettings();
}

/** Read one key with an explicit fallback (no DB round-trip guarantee of current). */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.select({ value: setting.value }).from(setting).where(eq(setting.key, key)).limit(1).then((r) => r[0] ?? null);
  return (row?.value as T | undefined) ?? fallback;
}