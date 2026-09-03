"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { createLowlight } from "lowlight";
import { common } from "lowlight";

const lowlight = createLowlight(common);

const languageLabels: Record<string, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  tsx: "TSX",
  jsx: "JSX",
  bash: "Shell",
  shell: "Shell",
  sql: "SQL",
  json: "JSON",
  css: "CSS",
  html: "HTML",
  python: "Python",
  go: "Go",
  rust: "Rust",
};

interface LineToken {
  cls: string;
  text: string;
}

type HastNode =
  | { type: "text"; value: string }
  | { type: "element"; tagName?: string; properties?: Record<string, unknown>; children: HastNode[] }
  | { type: "root"; children: HastNode[] };

function tokenizeLineTrees(root: HastNode): { lines: LineToken[][]; byLine: boolean } {
  const lines: LineToken[][] = [[]];

  const pushText = (text: string, cls: string) => {
    const parts = text.split("\n");
    while (parts.length > 0) {
      const part = parts.shift() ?? "";
      const row = lines[lines.length - 1];
      const prev = row[row.length - 1];
      if (prev && prev.cls === cls) prev.text += part;
      else row.push({ cls, text: part });
      if (parts.length > 0) lines.push([]);
    }
  };

  const walk = (node: HastNode, inherited: string) => {
    if (node.type === "text") {
      pushText(node.value, inherited);
      return;
    }
    if (node.type === "element") {
      const own = Array.isArray(node.properties?.className)
        ? (node.properties!.className as string[]).join(" ")
        : typeof node.properties?.className === "string"
          ? String(node.properties.className)
          : "";
      const cls = inherited ? [inherited, own].filter(Boolean).join(" ") : own;
      for (const child of node.children) walk(child, cls);
    } else if (node.type === "root") {
      for (const child of node.children) walk(child, inherited);
    }
  };

  walk(root, "");
  return { lines, byLine: true };
}

interface CodeBlockProps {
  language: string;
  code: string;
}

export function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const label = (languageLabels[language] ?? language) || "Text";

  const highlighted = useMemo<{ ok: boolean; lines: LineToken[][] }>(() => {
    const trimmed = code.replace(/\s+$/, "");
    if (!trimmed) return { ok: true, lines: [] };
    try {
      const tree = lowlight.highlight(language, trimmed);
      const { lines } = tokenizeLineTrees(tree as HastNode);
      return { ok: true, lines };
    } catch {
      return {
        ok: false,
        lines: trimmed.split("\n").map((line) => [{ cls: "", text: line }]),
      };
    }
  }, [code, language]);

  const lineCount = useMemo(() => {
    if (highlighted.ok && highlighted.lines.length > 0) return highlighted.lines.length;
    const trimmed = code.replace(/\s+$/, "");
    return trimmed ? trimmed.split("\n").length : 0;
  }, [code, highlighted]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [code]);

  return (
    <div
      className="my-6 rounded-xl overflow-hidden border border-white/5"
      style={{ background: "var(--code-bg)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{
          borderColor: "rgba(255,255,255,0.07)",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <span
          className="text-xs font-medium font-mono"
          style={{ color: "var(--code-comment)" }}
        >
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors"
          style={{
            color: copied ? "var(--code-string)" : "var(--code-comment)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="overflow-x-auto px-4 py-4">
        <div
          className="table text-sm leading-relaxed min-w-full"
          style={{ fontFamily: "var(--font-mono)", color: "var(--code-fg)" }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="table-row">
              <span className="table-cell pr-4 text-right select-none code-line-number">
                {i + 1}
              </span>
              <span className="table-cell whitespace-pre">
                {highlighted.lines[i]
                  ? highlighted.lines[i].map((tok, j) =>
                      tok.cls ? (
                        <span key={j} className={tok.cls}>
                          {tok.text}
                        </span>
                      ) : (
                        tok.text
                      )
                    )
                  : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}