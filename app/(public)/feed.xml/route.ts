import { getPublishedPosts } from "@/lib/services/posts";
import { getSettings } from "@/lib/services/settings";
import { absoluteUrl, siteBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const [posts, settings] = await Promise.all([getPublishedPosts({ limit: 20 }), getSettings()]);
  const base = siteBaseUrl();

  const items = posts
    .map((post) => {
      const link = absoluteUrl(`/blog/${post.slug}`);
      const description = post.excerpt ?? post.seoDescription ?? "";
      const published = (post.publishedAt ?? post.createdAt).toUTCString();
      const updated = post.updatedAt.toUTCString();
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${published}</pubDate>
      <updated>${updated}</updated>
      ${description ? `<description>${escapeXml(description)}</description>` : ""}
      ${post.category?.name ? `<category>${escapeXml(post.category.name)}</category>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(settings.siteName)}</title>
    <link>${escapeXml(base.replace(/\/$/, ""))}</link>
    <description>${escapeXml(settings.description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(absoluteUrl("/feed.xml"))}" rel="self" type="application/rss+xml" />
    ${settings.defaultOgImagePath ? `<image><url>${escapeXml(absoluteUrl(settings.defaultOgImagePath))}</url><title>${escapeXml(settings.siteName)}</title><link>${escapeXml(base.replace(/\/$/, ""))}</link></image>` : ""}
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}