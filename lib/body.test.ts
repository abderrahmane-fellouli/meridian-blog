import { describe, expect, it } from "vitest";
import {
  deriveExcerpt,
  estimateReadingTime,
  extractHeadings,
  extractPlainText,
  headingIndex,
  isBodyJson,
  parseBodyJson,
} from "@/lib/body";

const doc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "First Heading" }] },
    { type: "paragraph", content: [{ type: "text", text: "Some body text." }] },
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "First Heading" }] },
    { type: "codeBlock", attrs: { language: "ts" }, content: [{ type: "text", text: "const x = 1;" }] },
  ],
};

describe("isBodyJson / parseBodyJson", () => {
  it("accepts a valid doc", () => {
    expect(isBodyJson(doc)).toBe(true);
  });

  it("rejects unknown node types", () => {
    expect(isBodyJson({ type: "doc", content: [{ type: "hacker", text: "x" }] })).toBe(false);
  });

  it("rejects non-doc roots", () => {
    expect(isBodyJson({ type: "paragraph" })).toBe(false);
  });

  it("parse falls back to empty doc on null", () => {
    expect(parseBodyJson(null)).toEqual({ type: "doc", content: [] });
  });
});

describe("extractPlainText", () => {
  it("joins text including code blocks", () => {
    const t = extractPlainText(doc as never);
    expect(t).toContain("Some body text.");
    expect(t).toContain("const x = 1;");
  });
});

describe("headings", () => {
  it("extracts with dedup ids", () => {
    const idx = headingIndex(doc as never);
    expect(idx).toEqual([
      { id: "first-heading", level: 2, text: "First Heading" },
      { id: "first-heading-2", level: 3, text: "First Heading" },
    ]);
  });

  it("skips empty headings", () => {
    const idx = headingIndex({
      type: "doc",
      content: [{ type: "heading", attrs: { level: 2 }, content: [] }],
    } as never);
    expect(idx).toHaveLength(0);
  });

  it("extractHeadings mirrors headingIndex", () => {
    expect(extractHeadings(doc as never)).toHaveLength(2);
  });
});

describe("deriveExcerpt", () => {
  it("truncates long text with ellipsis", () => {
    const e = deriveExcerpt({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(300) }] }],
    } as never);
    expect(e.length).toBeLessThanOrEqual(220);
    expect(e.endsWith("…")).toBe(true);
  });

  it("short text kept", () => {
    expect(deriveExcerpt({ type: "doc", content: [] } as never)).toBe("");
  });
});

describe("estimateReadingTime", () => {
  it("is 1 min minimum", () => {
    expect(estimateReadingTime({ type: "doc", content: [] } as never)).toBe(1);
  });

  it("scales with words", () => {
    const words = Array.from({ length: 440 }, () => "word").join(" ");
    const rt = estimateReadingTime({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: words }] }],
    } as never);
    expect(rt).toBe(2);
  });
});