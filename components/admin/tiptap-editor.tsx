"use client";

import { forwardRef, useImperativeHandle } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import type { BodyDoc } from "@/lib/body";

const lowlight = createLowlight(common);

const ALLOWED_LINK_RE = /^(https?:|mailto:)/i;

export type EditorTool =
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "h2"
  | "h3"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "codeBlock"
  | "undo"
  | "redo"
  | "hr";

const TOOL_ACTIVE: Record<EditorTool, (ed: Editor) => boolean> = {
  bold: (ed) => ed.isActive("bold"),
  italic: (ed) => ed.isActive("italic"),
  strike: (ed) => ed.isActive("strike"),
  code: (ed) => ed.isActive("code"),
  h2: (ed) => ed.isActive("heading", { level: 2 }),
  h3: (ed) => ed.isActive("heading", { level: 3 }),
  bulletList: (ed) => ed.isActive("bulletList"),
  orderedList: (ed) => ed.isActive("orderedList"),
  blockquote: (ed) => ed.isActive("blockquote"),
  codeBlock: (ed) => ed.isActive("codeBlock"),
  undo: () => false,
  redo: () => false,
  hr: () => false,
};

export interface TiptapEditorHandle {
  focus: () => void;
  insertImage: (src: string, alt?: string) => void;
  exec: (tool: EditorTool) => void;
  isActive: (tool: EditorTool) => boolean;
  isCodeBlockActive: () => boolean;
  promptLink: () => void;
  unlink: () => void;
  isLinkActive: () => boolean;
  getCodeLanguage: () => string | null;
  setCodeLanguage: (lang: string) => void;
}

export const TiptapEditor = forwardRef<
  TiptapEditorHandle,
  { value: BodyDoc; onChange: (body: BodyDoc) => void; placeholder?: string; onReady?: (editor: Editor | null) => void }
>(function TiptapEditor({ value, onChange, placeholder = "Write…", onReady }, ref) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: "plaintext" }),
      LinkExtension.configure({ openOnClick: false, autolink: true, defaultProtocol: "https", isAllowedUri: (url) => ALLOWED_LINK_RE.test(url ?? "") }),
      ImageExtension.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
      Typography,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-neutral dark:prose-invert max-w-none focus:outline-none min-h-[24rem] px-4 py-4 text-[var(--tx-1)]",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as unknown as BodyDoc),
    async onTransaction() {
      onReady?.(editor ?? null);
    },
    async onCreate() {
      onReady?.(editor ?? null);
    },
  });

  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus(),
    insertImage: (src: string, alt?: string) => {
      editor?.chain().focus().setImage({ src, alt: alt ?? "" }).run();
    },
    exec: (tool) => {
      if (!editor) return;
      const chain = editor.chain().focus();
      switch (tool) {
        case "bold": chain.toggleBold().run(); break;
        case "italic": chain.toggleItalic().run(); break;
        case "strike": chain.toggleStrike().run(); break;
        case "code": chain.toggleCode().run(); break;
        case "h2": chain.toggleHeading({ level: 2 }).run(); break;
        case "h3": chain.toggleHeading({ level: 3 }).run(); break;
        case "bulletList": chain.toggleBulletList().run(); break;
        case "orderedList": chain.toggleOrderedList().run(); break;
        case "blockquote": chain.toggleBlockquote().run(); break;
        case "codeBlock": chain.toggleCodeBlock().run(); break;
        case "undo": chain.undo().run(); break;
        case "redo": chain.redo().run(); break;
        case "hr": chain.setHorizontalRule().run(); break;
      }
    },
    isActive: (tool) => Boolean(editor && TOOL_ACTIVE[tool](editor)),
    isCodeBlockActive: () => Boolean(editor?.isActive("codeBlock")),
    promptLink: () => {
      if (!editor) return;
      const prev = typeof editor.getAttributes("link")?.href === "string" ? String(editor.getAttributes("link").href) : "";
      const entered = window.prompt("Link URL (https://, http:// or mailto:)", prev);
      if (entered === null) return;
      const value = entered.trim();
      if (!value) {
        editor.chain().focus().unsetLink().run();
        return;
      }
      const normalized = value.startsWith("//") ? `https:${value}` : value;
      if (!ALLOWED_LINK_RE.test(normalized)) {
        window.alert("Only http(s) and mailto links are allowed.");
        return;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
    },
    unlink: () => editor?.chain().focus().unsetLink().run(),
    isLinkActive: () => Boolean(editor?.isActive("link")),
    getCodeLanguage: () => {
      if (!editor?.isActive("codeBlock")) return null;
      return String(editor.getAttributes("codeBlock")?.language ?? "plaintext");
    },
    setCodeLanguage: (lang) => {
      if (!editor?.isActive("codeBlock")) return;
      editor.commands.updateAttributes("codeBlock", { language: lang });
    },
  }));

  if (!editor) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] min-h-[24rem] flex items-center justify-center text-sm text-[var(--tx-3)]">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="bg-transparent">
      <EditorContent editor={editor} />
    </div>
  );
});