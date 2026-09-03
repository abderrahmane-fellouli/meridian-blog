import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderBody } from "@/lib/render";

const doc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "A Title" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Hello " },
        { type: "text", text: "world", marks: [{ type: "bold" }] },
        { type: "text", text: " and ", marks: [] },
        {
          type: "text",
          text: "a link",
          marks: [{ type: "link", attrs: { href: "https://example.com" } }],
        },
      ],
    },
  ],
};

function render(doc: unknown): string {
  return renderToStaticMarkup(<div>{renderBody(doc as never)}</div>);
}

describe("renderBody", () => {
  it("renders headings with anchor ids", () => {
    const html = render(doc);
    expect(html).toContain('<h2 id="a-title">A Title</h2>');
  });

  it("renders marks and safe links", () => {
    const html = render(doc);
    expect(html).toContain("<strong>world</strong>");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("drops javascript: link hrefs", () => {
    const evil = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "boom", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
          ],
        },
      ],
    };
    const html = render(evil);
    expect(html).not.toContain("javascript:");
    expect(html).toContain("boom"); // text still rendered
  });

  it("escapes raw text (no HTML injection)", () => {
    const evil = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] },
      ],
    };
    const html = render(evil);
    expect(html).not.toContain("<script>");
  });

  it("renders code blocks with language label", () => {
    const withCode = {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "bash" },
          content: [{ type: "text", text: "echo hi" }],
        },
      ],
    };
    const html = render(withCode);
    expect(html).toContain("Shell");
    expect(html).toContain('class="hljs-built_in">echo</span> hi');
  });

  it("renders lists and blockquote", () => {
    const html = render({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "two" }] }] },
          ],
        },
        {
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: "quoted" }] }],
        },
      ],
    });
    expect(html).toContain("<ul>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("quoted");
  });

  it("renders image with safe relative src", () => {
    const html = render({
      type: "doc",
      content: [
        { type: "image", attrs: { src: "/uploads/2026/08/a.png", alt: "pic", title: "Caption" } },
      ],
    });
    expect(html).toContain('<img src="/uploads/2026/08/a.png" alt="pic"');
    expect(html).toContain("<figcaption");
  });

  it("drops non-http image src", () => {
    const html = render({
      type: "doc",
      content: [{ type: "image", attrs: { src: "data:text/html,x", alt: "" } }],
    });
    expect(html).not.toContain("data:text/html");
  });

  it("ignores unknown node types", () => {
    const html = render({ type: "doc", content: [{ type: "mystery", text: "x" }] });
    expect(html).not.toContain("mystery");
  });
});