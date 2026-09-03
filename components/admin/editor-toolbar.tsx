"use client";

import { useEffect, useReducer } from "react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  Link2,
  ImagePlus,
  Undo2,
  Redo2,
  Strikethrough,
  Code,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";
import type { EditorTool, TiptapEditorHandle } from "@/components/admin/tiptap-editor";

const LANGUAGES = [
  "plaintext",
  "ts",
  "tsx",
  "js",
  "jsx",
  "html",
  "css",
  "json",
  "sql",
  "bash",
  "markdown",
];

function ToolbarButton({
  icon: Icon,
  title,
  active,
  onExecute,
  size = 14,
}: {
  icon: LucideIcon;
  title: string;
  active?: boolean;
  onExecute: () => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault();
        onExecute();
      }}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        active
          ? "bg-[var(--accent-muted)] text-[var(--accent)]"
          : "text-[var(--tx-3)] hover:bg-[var(--bg-muted)] hover:text-[var(--tx-1)]"
      )}
    >
      <Icon size={size} />
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-[var(--border)] mx-1" />;
}

export function EditorToolbar({
  api,
  editor,
  onImage,
}: {
  api: React.RefObject<TiptapEditorHandle | null>;
  editor: Editor | null;
  onImage: () => void;
}) {
  const [, bump] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    if (!editor) return;
    editor.on("selectionUpdate", bump);
    editor.on("transaction", bump);
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("transaction", bump);
    };
  }, [editor]);

  const exec = (tool: EditorTool) => api.current?.exec(tool);
  const active = (tool: EditorTool) => api.current?.isActive(tool) ?? false;

  return (
    <div className="sticky top-0 z-10 flex items-center gap-0.5 flex-wrap px-4 py-2 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm">
      <ToolbarButton icon={Bold} title="Bold (⌘B)" active={active("bold")} onExecute={() => exec("bold")} />
      <ToolbarButton icon={Italic} title="Italic (⌘I)" active={active("italic")} onExecute={() => exec("italic")} />
      <Divider />
      <ToolbarButton icon={Heading2} title="Heading 2" active={active("h2")} onExecute={() => exec("h2")} />
      <ToolbarButton icon={Heading3} title="Heading 3" active={active("h3")} onExecute={() => exec("h3")} />
      <Divider />
      <ToolbarButton icon={List} title="Bullet list" active={active("bulletList")} onExecute={() => exec("bulletList")} />
      <ToolbarButton icon={ListOrdered} title="Numbered list" active={active("orderedList")} onExecute={() => exec("orderedList")} />
      <ToolbarButton icon={Quote} title="Blockquote" active={active("blockquote")} onExecute={() => exec("blockquote")} />
      <Divider />
      <ToolbarButton icon={Code2} title="Code block" active={active("codeBlock")} onExecute={() => exec("codeBlock")} />
      <ToolbarButton
        icon={Link2}
        title="Link"
        active={api.current?.isLinkActive() ?? false}
        onExecute={() => api.current?.promptLink()}
      />
      <ToolbarButton icon={ImagePlus} title="Image" onExecute={onImage} />

      <div className="flex-1" />
      <Divider />
      <ToolbarButton icon={Undo2} title="Undo (⌘Z)" onExecute={() => exec("undo")} />
      <ToolbarButton icon={Redo2} title="Redo (⌘⇧Z)" onExecute={() => exec("redo")} />

      <Divider />
      <ToolbarButton icon={Strikethrough} title="Strikethrough" active={active("strike")} onExecute={() => exec("strike")} />
      <ToolbarButton icon={Code} title="Inline code" active={active("code")} onExecute={() => exec("code")} />
      <ToolbarButton icon={Minus} title="Horizontal rule" onExecute={() => exec("hr")} />
      {api.current?.isCodeBlockActive() && (
        <select
          value={api.current?.getCodeLanguage() ?? "plaintext"}
          onChange={(e) => api.current?.setCodeLanguage(e.target.value)}
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Code block language"
          className="ml-1 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-[var(--tx-2)] focus:outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}