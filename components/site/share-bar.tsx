"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";

interface ShareBarProps {
  title: string;
  className?: string;
}

export function ShareBar({ title, className }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleXPost = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-[var(--tx-3)] mr-1">Share</span>
        <button
          onClick={handleXPost}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--tx-2)] hover:bg-[var(--bg-muted)] transition-colors"
          aria-label="Share on X"
        >
          𝕏 Post
        </button>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--tx-2)] hover:bg-[var(--bg-muted)] transition-colors"
          aria-label="Copy link to article"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <LinkIcon size={13} />}
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}