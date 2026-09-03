import { describe, expect, it } from "vitest";
import { normalizeSourcePath } from "@/lib/services/redirects";
import { sanitizeSearchQuery } from "@/lib/services/search";
import { defaultSiteSettings, mergeSettingsStored } from "@/lib/services/settings";

describe("normalizeSourcePath", () => {
  it("ensures leading slash", () => {
    expect(normalizeSourcePath("posts/foo")).toBe("/posts/foo");
  });

  it("strips trailing slash except root", () => {
    expect(normalizeSourcePath("/posts/foo/")).toBe("/posts/foo");
    expect(normalizeSourcePath("/")).toBe("/");
  });

  it("strips query and hash", () => {
    expect(normalizeSourcePath("/posts?x=1")).toBe("/posts");
    expect(normalizeSourcePath("/a#top")).toBe("/a");
  });

  it("collapses duplicate slashes", () => {
    expect(normalizeSourcePath("//foo//bar")).toBe("/foo/bar");
  });

  it("handles empty input as root", () => {
    expect(normalizeSourcePath("")).toBe("/");
    expect(normalizeSourcePath("   ")).toBe("/");
  });
});

describe("sanitizeSearchQuery", () => {
  it("strips control characters", () => {
    expect(sanitizeSearchQuery("ok\u0000\u001ftext")).toBe("ok text");
  });

  it("trims and caps length", () => {
    expect(sanitizeSearchQuery("  hello  ")).toBe("hello");
    expect(sanitizeSearchQuery("a".repeat(500))).toHaveLength(200);
  });
});

describe("defaultSiteSettings", () => {
  it("has sane defaults for every field", () => {
    const d = defaultSiteSettings();
    expect(d.siteName.length).toBeGreaterThan(0);
    expect(d.tagline.length).toBeGreaterThan(0);
    expect(d.authorName.length).toBeGreaterThan(0);
    expect(d.socialLinks).toEqual([]);
    expect(d.defaultOgImagePath).toBeNull();
  });
});

describe("mergeSettingsStored", () => {
  it("keeps defaults when nothing is stored", () => {
    const merged = mergeSettingsStored({});
    expect(merged).toEqual(defaultSiteSettings());
  });

  it("overrides a text field from the DB row", () => {
    const merged = mergeSettingsStored({ site_name: "Example Co" });
    expect(merged.siteName).toBe("Example Co");
    expect(merged.tagline).toBe(defaultSiteSettings().tagline);
  });

  it("ignores whitespace-only text overrides", () => {
    expect(mergeSettingsStored({ site_tagline: "   " }).tagline).toBe(defaultSiteSettings().tagline);
  });

  it("normalizes social links", () => {
    const merged = mergeSettingsStored({
      social_links: [
        { label: "G", url: "https://github.com/x" },
        { label: "Broken", url: "" },
        "garbage",
      ],
    });
    expect(merged.socialLinks).toEqual([{ label: "G", url: "https://github.com/x" }]);
  });

  it("coerces og path to null when empty", () => {
    expect(mergeSettingsStored({ default_og_image: "" }).defaultOgImagePath).toBeNull();
    expect(mergeSettingsStored({ default_og_image: "/media/og.png" }).defaultOgImagePath).toBe("/media/og.png");
  });

  it("ignores unknown keys", () => {
    const merged = mergeSettingsStored({ mystery_key: "x" });
    expect(merged).toEqual(defaultSiteSettings());
  });
});