import type { NextConfig } from "next";

/**
 * Builds the `img-src` list for the Content Security Policy. Local uploads are
 * served from `'self'`; object-storage images are served from the configured
 * S3/R2 public origin. The exact origin is whitelisted (not a broad `https:`)
 * so external image hosts remain blocked unless explicitly configured.
 */
function imageSources(): string[] {
  const sources = ["'self'", "blob:", "data:"];
  const base = process.env.S3_PUBLIC_BASE_URL ?? process.env.S3_ENDPOINT;
  if (base) {
    try {
      const origin = new URL(base).origin;
      if (origin && origin !== "null") sources.push(origin);
    } catch {
      // ignore malformed URL; fall back to the base list
    }
  }
  return sources;
}

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  // Served over HTTPS in production; the header is inert over plain HTTP
  // but forces HSTS once the site is behind TLS.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // The app has no third-party scripts. `script-src 'unsafe-inline'` is required
  // for Next's hydration bootstrap and the no-flash theme-init inline script.
  // All rendered user content (Tiptap bodies) is escaped/href-sanitized server-side,
  // so CSP is defense-in-depth here. frame-ancestors denies clickjacking.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      `img-src ${imageSources().join(" ")}`,
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;