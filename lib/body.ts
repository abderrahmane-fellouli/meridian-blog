import { z } from "zod";

/* eslint-disable @typescript-eslint/no-explicit-any -- Tiptap bodies are
   schemaless JSON at the storage boundary; the recursive z.lazy() schemas
   below intentionally annotate with `any`. */

/* ── Tiptap JSON body model (single source of truth for bodies) ── */

const markSchema = z.object({
  type: z.enum(["bold", "italic", "strike", "code", "link", "underline"]),
  attrs: z.record(z.string(), z.unknown()).optional(),
});

const textNodeSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  marks: z.array(markSchema).optional(),
});

const paragraphNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.literal("paragraph"),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(textNodeSchema).optional(),
  })
);

const headingNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.literal("heading"),
    attrs: z.object({ level: z.number().int().min(1).max(6) }).optional(),
    content: z.array(textNodeSchema).optional(),
  })
);

const listItemNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.literal("listItem"),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(z.union([paragraphNodeSchema, codeBlockNodeSchema, bulletListNodeSchema, orderedListNodeSchema])).optional(),
  })
);

const bulletListNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.literal("bulletList"),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(listItemNodeSchema).optional(),
  })
);

const orderedListNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.literal("orderedList"),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(listItemNodeSchema).optional(),
  })
);

const codeBlockNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.literal("codeBlock"),
    attrs: z.object({ language: z.string().optional() }).optional(),
    content: z.array(textNodeSchema).optional(),
  })
);

const blockquoteNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.literal("blockquote"),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(z.union([paragraphNodeSchema])).optional(),
  })
);

const imageNodeSchema = z.object({
  type: z.literal("image"),
  attrs: z.object({
    src: z.string(),
    alt: z.string().optional(),
    title: z.string().optional(),
  }),
});

const horizontalRuleNodeSchema = z.object({ type: z.literal("horizontalRule") });

export const bodyNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.literal("doc"),
    content: z
      .array(
        z.union([
          paragraphNodeSchema,
          headingNodeSchema,
          bulletListNodeSchema,
          orderedListNodeSchema,
          codeBlockNodeSchema,
          blockquoteNodeSchema,
          imageNodeSchema,
          horizontalRuleNodeSchema,
        ])
      )
      .optional(),
  })
);

export type BodyDoc = z.infer<typeof bodyNodeSchema>;
export type BodyTextNode = z.infer<typeof textNodeSchema>;
export type BodyMark = z.infer<typeof markSchema>;

export const EMPTY_BODY: BodyDoc = { type: "doc", content: [] };

export function parseBodyJson(value: unknown): BodyDoc {
  if (value === null || value === undefined) return EMPTY_BODY;
  return bodyNodeSchema.parse(value);
}

export function isBodyJson(value: unknown): value is BodyDoc {
  return bodyNodeSchema.safeParse(value).success;
}

/** Collects all text from a body, e.g. for excerpt fallback and RSS. */
export function extractPlainText(body: BodyDoc): string {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === "text") {
      out.push(n.text ?? "");
      return;
    }
    if (n.type === "image") {
      const attrs = (node as { attrs?: { alt?: string } }).attrs;
      if (attrs?.alt) out.push(attrs.alt);
      return;
    }
    if (n.type === "codeBlock") {
      for (const child of n.content ?? []) walk(child);
      out.push("\n");
    }
    if (n.type === "horizontalRule") {
      out.push("\n");
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) walk(child);
    }
  };
  walk(body);
  return out.join("").replace(/\s+/g, " ").trim();
}

export interface TocEntry {
  id: string;
  level: number;
  text: string;
}

interface HeadingIndex {
  id: string;
  level: number;
  text: string;
}

export function headingIndex(body: BodyDoc): HeadingIndex[] {
  const entries: HeadingIndex[] = [];
  const seen: Record<string, number> = {};
  for (const node of body.content ?? []) {
    if (node.type !== "heading") continue;
    const text = node.content
      ? (node.content as Array<{ text?: string }>).map((t) => t.text ?? "").join("")
      : "";
    if (!text.trim()) continue;
    const base = slugifyHeading(text);
    const count = seen[base] ?? 0;
    seen[base] = count + 1;
    const id = count === 0 ? base : `${base}-${count + 1}`;
    const level = node.attrs?.level ?? 2;
    entries.push({ id, level, text });
  }
  return entries;
}

/** Extracts top-level headings for a table of contents. */
export function extractHeadings(body: BodyDoc): TocEntry[] {
  return headingIndex(body).map(({ id, level, text }) => ({ id, level, text }));
}

function slugifyHeading(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";
}

const WORDS_PER_MINUTE = 220;

export function estimateReadingTime(body: BodyDoc): number {
  const words = extractPlainText(body).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Default excerpt when the author leaves it blank. */
export function deriveExcerpt(body: BodyDoc): string {
  const plain = extractPlainText(body);
  if (!plain) return "";
  return plain.length > 220 ? `${plain.slice(0, 217).trimEnd()}…` : plain;
}