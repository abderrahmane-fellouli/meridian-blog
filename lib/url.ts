const DEFAULT_BASE = "http://localhost:3000";

/** Root origin for absolute links (RSS, sitemaps, canonical, structured data). */
export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? DEFAULT_BASE).replace(/\/+$/, "");
}

/** Resolve a site path to an absolute URL. Absolute inputs pass through unchanged. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = siteBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}