import type { ReactNode } from "react";
import {
  type BodyDoc,
  type BodyMark,
  headingIndex,
  type TocEntry,
} from "@/lib/body";
import { CodeBlock } from "@/components/article/code-block";

const SAFE_LINK_RE = /^(https?:\/\/|mailto:|#|\/)/i;

function safeHref(href: unknown): string | undefined {
  if (typeof href !== "string" || href.length === 0) return undefined;
  if (!SAFE_LINK_RE.test(href)) return undefined;
  return href;
}

function safeImageSrc(src: string): string | undefined {
  if (!src) return undefined;
  if (/^(\/|https?:\/\/)/i.test(src)) return src;
  return undefined;
}

function renderTextLeaf(node: { type?: string; text?: string; marks?: BodyMark[] }): ReactNode {
  let content: ReactNode = node.text ?? "";
  const marks = node.marks ?? [];

  const wrap = (acc: ReactNode, mark: BodyMark, k: number): ReactNode => {
    switch (mark.type) {
      case "bold":
        return <strong key={k}>{acc}</strong>;
      case "italic":
        return <em key={k}>{acc}</em>;
      case "strike":
        return <s key={k}>{acc}</s>;
      case "code":
        return <code key={k}>{acc}</code>;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        if (!href) return acc;
        return (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer">
            {acc}
          </a>
        );
      }
      case "underline":
        return (
          <span key={k} className="underline">
            {acc}
          </span>
        );
      default:
        return acc;
    }
  };

  for (let i = marks.length - 1; i >= 0; i -= 1) {
    content = wrap(content, marks[i], i);
  }
  return content;
}

type InlineNode = { type?: string; text?: string; marks?: BodyMark[] };

function renderInline(node: InlineNode): ReactNode {
  if (node.type === "text") return renderTextLeaf(node);
  return null;
}

type BlockNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: unknown[];
};

export function renderBody(body: BodyDoc): ReactNode[] {
  const headings = headingIndex(body);
  let cursor = 0;

  const takeHeading = (): TocEntry | undefined => {
    const entry = headings[cursor];
    if (entry) cursor += 1;
    return entry;
  };

  const renderBlockContent = (content: unknown[] | undefined): ReactNode =>
    content && content.length
      ? (content as BlockNode[]).map((n, i) => renderBlock(n, i))
      : null;

  const renderBlock = (node: BlockNode, key: number): ReactNode => {
    switch (node.type) {
      case "paragraph": {
        const children = (node.content ?? []) as InlineNode[];
        return (
          <p key={key}>{children.length ? children.map((c) => renderInline(c)) : ""}</p>
        );
      }
      case "heading": {
        const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 2)) as
          | 1
          | 2
          | 3
          | 4
          | 5
          | 6;
        const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
        const entry = takeHeading();
        const children = (node.content ?? []) as InlineNode[];
        return (
          <Tag key={key} id={entry?.id}>
            {children.map((c) => renderInline(c))}
          </Tag>
        );
      }
      case "bulletList":
      case "orderedList": {
        const items = (node.content ?? []) as Array<{ content?: unknown[] }>;
        const Tag = node.type === "bulletList" ? "ul" : "ol";
        return (
          <Tag key={key}>
            {items.map((item, j) => (
              <li key={j}>{renderBlockContent(item.content)}</li>
            ))}
          </Tag>
        );
      }
      case "codeBlock": {
        const language = typeof node.attrs?.language === "string" ? node.attrs.language : "";
        const code = (node.content ?? [])
          .map((t) =>
            t && typeof t === "object" && "text" in t
              ? String((t as { text?: string }).text ?? "")
              : ""
          )
          .join("\n");
        return <CodeBlock key={key} language={language} code={code} />;
      }
      case "blockquote":
        return <blockquote key={key}>{renderBlockContent(node.content)}</blockquote>;
      case "image": {
        const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
        const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
        const title = typeof node.attrs?.title === "string" ? node.attrs.title : "";
        const safe = safeImageSrc(src);
        if (!safe) return null;
        return (
          <figure key={key} className="my-8">
            {/* eslint-disable-next-line @next/next/no-img-element -- body images may point at local uploads with arbitrary dimensions */}
            <img src={safe} alt={alt} title={title || undefined} />
            {title ? (
              <figcaption className="mt-2 text-center text-sm" style={{ color: "var(--tx-3)" }}>
                {title}
              </figcaption>
            ) : null}
          </figure>
        );
      }
      case "horizontalRule":
        return <hr key={key} />;
      default:
        return null;
    }
  };

  const blocks = ((body.content ?? []) as BlockNode[]).map((n, i) => renderBlock(n, i));
  return blocks;
}