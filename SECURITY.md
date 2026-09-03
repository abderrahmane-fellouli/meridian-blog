# Meridian — Security

This document describes the security model of the blog and how it is verified.

## Authentication & authorization

- **Better Auth** (`app/api/auth/[...all]/route.ts`) with a single credential
  account (`isOwner`). Login is email + password; the seat is
  `OWNER_EMAIL` from `.env.local`.
- **The security boundary** is `lib/auth-server.ts`. The admin shell layout,
  every server action, and route handlers call `requireOwner()` /
  `requireOwnerReady()` / `requireOwnerJson()`. Admin route-group middleware
  that redirects unauthenticated visitors to `/admin/login` is **UX-only** and
  is never relied on for access control.
- **Forced password change**: a freshly seeded owner is created with
  `mustChangePassword = true`; `requireOwnerReady` blocks access until a new
  password is set at `/admin/password`.
- **Brute-force protection**:
  - Better Auth `rateLimit` on the auth API (10 attempts / 60 s per key).
  - Application-level `loginAttempt` lockout on login (5 failures / 15 min)
    before the password gate is reachable.
- Sessions are stored in the DB and invalidated on sign-out; sessions are
  deleted when the owner password changes.

## Transport & headers

`next.config.ts` applies headers to all routes:

- `Content-Security-Policy`: `default-src 'self'`; `script-src 'self' 'unsafe-inline'`
  (required by Next's hydration bootstrap and the no-flash theme script —
  the app has **no third-party scripts**); `style-src 'self' 'unsafe-inline'`;
  `img-src 'self' blob: data:` **plus the configured object-storage origin**
  (`S3_PUBLIC_BASE_URL`, added dynamically in `next.config.ts` — the exact
  origin is whitelisted, never a broad `https:`); `object-src 'none'`;
  `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`
  (clickjacking defense).
  There are no third-party or mixed-content subresources, so
  `upgrade-insecure-requests` is intentionally omitted — it would force
  redirects/forms over HTTPS even when the app is served over plain HTTP.
  Forcing HTTPS is delegated to HSTS + the reverse proxy instead.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Resource-Policy: same-origin`,
  `Permissions-Policy`, and `Strict-Transport-Security`
  (active once served over HTTPS).

## Content safety (XSS)

- Post/render paths are **server-rendered HTML from structured Tiptap JSON**.
  `lib/render.tsx` (`renderBody`) renders a strict allowlist of node types and
  drops `javascript:` hrefs; covered by `lib/render.test.tsx`.
- Tag/category slugs are slugified; uploads only ever served as images.
- Search input is sanitized (`lib/services/search.ts`, `sanitizeSearchQuery`).

## Upload validation

`lib/services/media.ts` validates every upload:

- MIME whitelist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- Empty-file rejection and a hard 10 MB size cap.
- **Local backend** (dev; no `S3_BUCKET`): files are written to
  `public/uploads/YYYY/MM/{uuid}.{ext}`; deletion is confined to the upload root
  (path-traversal guard in `MediaStorage.remove`).
- **Object-storage backend** (production; `S3_BUCKET` set): objects are written
  to `S3_PREFIX/YYYY/MM/{uuid}.{ext}`. Keys are always server-generated UUIDs so
  there is no user-supplied path component, and deletion targets the stored key
  only.
- Media server actions require `requireOwnerReady()`. The S3/R2 credentials are
  server-side only and the public image origin is the only external image source
  allowed by CSP.

## Scheduled publishing

`/api/cron/publish-scheduled` is protected by `CRON_SECRET`:

- Vercel Cron sends the secret automatically as `Authorization: Bearer`;
  portable schedulers may use the same header or `?secret=`. Comparison is
  constant-time (`timingSafeEqual`).
- If `CRON_SECRET` is unset the route fails closed (`503`).
- The promotion is idempotent (only `status = 'scheduled'` rows due to publish
  are flipped), so duplicate/missed invocations are safe and cannot double-
  publish or expose content early.

## Secrets

- `.env*` is git-ignored. `.env.local` holds `DATABASE_URL`,
  `BETTER_AUTH_SECRET`, `OWNER_EMAIL`, `OWNER_BOOTSTRAP_PASSWORD`. Never commit
  a real `DATABASE_URL`/`BETTER_AUTH_SECRET`/bootstrap password.
- **Server-side only** (never `NEXT_PUBLIC_`): `CRON_SECRET` and the `S3_*`
  credentials/endpoint. Public image URLs come from `S3_PUBLIC_BASE_URL`, which
  is safe to expose; `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_ENDPOINT`
  are not.
- The bootstrap password is only valid until the owner changes it; treat it as a
  throwaway secret.
- The app does not expose secrets to the client; server actions/settings that
  read configuration return DTOs, never raw rows containing secrets.

## Operational guidance

- Keep dependencies updated (`pnpm outdated`); pin via the lockfile and the
  `packageManager` field.
- Prefer HTTPS at the edge; HSTS is preconfigured and takes effect over TLS.
- Backups are covered in [BACKUP.md](./BACKUP.md).

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test` run on every change.
- Browser QA (auth gates, forced password change, admin CRUD, 390/768/1280/1440
  viewports, light/dark) runs via Playwright with `pnpm test:e2e` against the
  production build.