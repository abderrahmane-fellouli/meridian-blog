# Meridian — Architecture

Meridian is a single-owner tech blog running on Next.js (App Router) with a
PostgreSQL database, Drizzle ORM, Better Auth, and a Tiptap-based admin editor.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript) — `next.config.ts` (security headers)
- **PostgreSQL** via `pg` + **Drizzle ORM** (`lib/db.ts`, `db/schema.ts`)
- **Better Auth** (`app/api/auth/[...all]/route.ts`) — credential login for one owner
- **Tiptap** editor + **sharp** image processing for uploads
- **Tailwind CSS v4** + shadcn/Radix primitives for UI
- **Vitest** (unit) and **Playwright** (E2E) — `pnpm test`, `pnpm test:e2e`
- Package manager: `pnpm` (v11, pinned via `packageManager`)

## Layout

- `app/(public)/` — public routes under a grouped layout:
  - `/`, `/blog`, `/blog/[slug]`, `/blog/category/[slug]`, `/blog/tag/[slug]`
  - `/search`, `/feed.xml`, `/about`, `/contact`, `/privacy`, `/terms`, `/affiliate-disclosure`
- `app/admin/` — owner-only CMS:
  - `/admin/login`, `/admin/password` (forced password change)
  - `/admin/(shell)/dashboard`, `/posts`, `/posts/new`, `/posts/[id]`,
    `/media`, `/taxonomy`, `/settings`
  - `/admin/preview/[id]` — unlisted draft preview
- `app/api/auth/[...all]/` — Better Auth single API route
- `app/api/cron/publish-scheduled/` — scheduled-publishing endpoint (see Scheduling)
- `app/sitemap.ts`, `app/robots.ts` — SEO metadata routes (dynamic)

## Data model (`db/schema.ts`)

- `users`, `accounts`, `sessions` — Better Auth tables. Users carry
  `isOwner`, `mustChangePassword`, `name`.
- `posts` — title, slug, status (`draft`/`published`), `publishedAt`, `updatedAt`,
  `excerpt` (derived from the lede when not provided), `featuredImagePath`/`featuredImageAlt`,
  `categoryId`, and `bodyJson` (jsonb — a Tiptap `doc`).
- `categories`, `tags`, `postTags` — taxonomy.
- `media` — upload metadata (`storagePath`, `urlPath`, mime/size/dimensions).
  Backend-agnostic: local writes to `public/uploads/YYYY/MM/`; when `S3_BUCKET`
  is configured (`lib/services/media.ts`) objects are stored on an S3-compatible
  bucket (e.g. Cloudflare R2) under `S3_PREFIX/YYYY/MM/` and served via
  `S3_PUBLIC_BASE_URL`.
- `settings` — single-row site settings (name, tagline, contact email, social
  links, default OG image). Fallback identity lives in `lib/site.ts`.

## Layers

1. **`lib/services/`** — the data layer. `posts.ts` (CRUD, pagination, search,
   excerpt derivation), `categories-tags.ts`, `media.ts` (validation +
   `MediaStorage` abstraction with a local and an S3-compatible backend),
   `scheduling.ts` (`publishDueScheduled` — idempotent scheduled→published
   promotion), `settings.ts`, `search.ts`, `redirects.ts`.
2. **`lib/actions/`** — server actions ("use server"). Every mutation first
   passes `requireOwner()` / `requireOwnerReady()` from `lib/auth-server.ts`.
3. **`app/(public)/` pages** — read-only rendering of posts and archives.
4. **`app/admin/`** — the owner shell; pages call server actions and/or services.

## Security boundary

`lib/auth-server.ts` defines the real boundary. The admin shell, every server
action, and route handlers must call `requireOwner` / `requireOwnerReady` /
`requireOwnerJson`. The admin route-group middleware that proxies to `/admin/login`
is UX-only and never treated as the security boundary. See [SECURITY.md](./SECURITY.md).

## Rendering

- Post bodies are stored as Tiptap `doc` JSON and rendered read-only by
  `lib/render.tsx` (`renderBody`). Links are rewritten to safe targets and
  `javascript:` hrefs are dropped — see `lib/render.test.tsx`.
- The site supports light/dark themes via `next-themes`; a small inline script
  in the root layout prevents flash of wrong theme (accounted for in CSP).
- SEO: canonical/OG metadata via `generateMetadata`, JSON-LD (schema.org
  `Article`) on post pages, `sitemap.xml` (dynamic), `robots.txt`,
  `feed.xml` (RSS, force-dynamic).
- Missing dynamic slugs (article/category/tag) render the not-found boundary
  via `notFound()` in `generateMetadata` and the page. Because Next streams the
  shell as `200` before dynamic data resolves, the status stays `200` (soft
  404); Next injects `<meta name="robots" content="noindex">`, keeping these
  pages out of search results. Turning them into hard `404`s would require an
  existence check in `proxy.ts` — deliberately not done, since it would put a
  Postgres query on the proxy hot path and duplicate the article/redirect
  resolution logic.

## Scheduling

Posts can be `draft` / `published` / `scheduled` / `archived`. A scheduled post
has `status = 'scheduled'` and a future `published_at`; it is invisible to the
public (same `publicPostCondition`). Promotion is handled by the cron route
`app/api/cron/publish-scheduled/route.ts`, which calls
`publishDueScheduled` (`lib/services/scheduling.ts`): it flips every post still
`scheduled` with `publishedAt <= now` to `published`, in one transaction, and
revalidates `/`, `/blog`, `/feed.xml`, `/sitemap.xml`. The status guard makes it
idempotent and reconciliation-based.

The route is portable: it authenticates with `CRON_SECRET` via the
`Authorization: Bearer` header or `?secret=`. `vercel.json` schedules it every
5 minutes on Vercel (paid plans; Hobby is once-per-day — see DEPLOYMENT.md);
any external scheduler can call the same route.

## Environment

All runtime config is in `.env.local` (git-ignored). Required keys:

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — session signing secret
- `BETTER_AUTH_URL` — canonical auth origin
- `OWNER_EMAIL`, `OWNER_BOOTSTRAP_PASSWORD` — used by `pnpm db:seed` to create
  the owner (password is reset on first login)
- `NEXT_PUBLIC_BASE_URL` — public base URL used for absolute links, sitemap, RSS
- `UPLOAD_ROOT` (optional) — overrides the default `public/uploads` storage root
  (local backend only)
- `S3_BUCKET` (optional) — enables the S3-compatible object-storage backend
  (production media). Companion keys: `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY`, `S3_REGION` (default `us-east-1`), `S3_PREFIX`
  (default `uploads`), `S3_PUBLIC_BASE_URL` (public image origin; also added to
  the CSP `img-src`).
- `CRON_SECRET` — secret for `/api/cron/publish-scheduled` (server-side only;
  Vercel sends it as `Authorization: Bearer`).

## Verified commands

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`
- `pnpm db:seed` (idempotent by post slug)
- `pnpm test:e2e` (browser QA against the built app)