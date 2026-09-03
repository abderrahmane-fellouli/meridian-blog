import { describe, expect, it } from "vitest";
import { ensureUniqueSlug, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("handles accents and special chars", () => {
    expect(slugify("Bon café & thé")).toBe("bon-cafe-the");
  });

  it("returns untitled for empty input", () => {
    expect(slugify("   ")).toBe("untitled");
    expect(slugify("!!!")).toBe("untitled");
  });

  it("collapses dashes and trims edges", () => {
    expect(slugify("--hello   world--")).toBe("hello-world");
  });

  it("lowercases and keeps alphanumerics", () => {
    expect(slugify("Hello, WORLD 123!")).toBe("hello-world-123");
  });

  it("caps length at 120", () => {
    expect(slugify("a".repeat(300))).toHaveLength(120);
  });
});

describe("ensureUniqueSlug", () => {
  it("returns base when free", async () => {
    await expect(ensureUniqueSlug("hello", async () => false)).resolves.toBe("hello");
  });

  it("increments suffix until unique", async () => {
    const taken = new Set(["hello", "hello-2", "hello-3"]);
    await expect(ensureUniqueSlug("hello", async (s) => taken.has(s))).resolves.toBe("hello-4");
  });
});