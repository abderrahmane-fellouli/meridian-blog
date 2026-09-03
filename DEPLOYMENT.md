# Meridian — Deployment

## Recommended production stack

This is the opinionated, verified stack this project ships toward:

| Concern | Choice |
| --- | --- |
| Git host | **GitHub** |
| Hosting platform | **Vercel** (serverless) — start on **Hobby** |
| Database | **Neon PostgreSQL** (managed, reachable via `DATABASE_URL`) |
| Object storage | **Cloudflare R2** (S3-compatible, public bucket / custom domain) |
| Scheduled publishing | **Vercel Cron** (daily on Hobby) |

Production must use object storage (serverless disk is ephemeral) and a managed
Postgres. See each section below for the exact steps.

## Prerequisites

- **Node.js 20+** and **pnpm 11** (repo pins `packageManager: pnpm@11.24.0`).
- A **PostgreSQL** database reachable via `DATABASE_URL`.
- The repo installs from the local `.pnpm` store; there is no external CI config in-tree.

## Environment (.env.local)

Required (see ARCHITECTURE.md):

| Key | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Session signing secret (long, random) |
| `BETTER_AUTH_URL` | Canonical origin Better Auth uses (e.g. `https://blog.example.com`) |
| `OWNER_EMAIL` | Owner account email (used by seed) |
| `OWNER_BOOTSTRAP_PASSWORD` | One-time owner password (≥ 12 chars; forced change on first login) |
| `NEXT_PUBLIC_BASE_URL` | Public base URL for canonical links, sitemap, RSS |
| `UPLOAD_ROOT` *(optional)* | Overrides default `public/uploads` storage root (local backend only) |

**Object storage** (production media; see "Storage tiers" below). When
`S3_BUCKET` is set the S3-compatible backend is used; otherwise local storage
keeps working unchanged for development:

| Key | Purpose |
| --- | --- |
| `S3_BUCKET` | Bucket / R2 container name (setting this enables the S3 backend) |
| `S3_ENDPOINT` | S3-compatible endpoint, e.g. Cloudflare R2 `https://<account>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` | Access key / R2 Access Key ID |
| `S3_SECRET_ACCESS_KEY` | Secret access key / R2 Secret Access Key |
| `S3_REGION` *(optional)* | Region (default `us-east-1`; R2 uses `auto`) |
| `S3_PREFIX` *(optional)* | Object key prefix (default `uploads`) |
| `S3_PUBLIC_BASE_URL` | Public HTTPS origin images are served from (e.g. an R2 public bucket / CDN). Also whitelisted in the CSP `img-src` |

**Scheduled publishing** (Vercel Cron and portable external schedulers; see
"Scheduling" below):

| Key | Purpose |
| --- | --- |
| `CRON_SECRET` | Shared secret (≥ 16 random chars). Vercel sends it as `Authorization: Bearer <secret>`; external schedulers may use the header or `?secret=` |

Never commit `.env.local`. Generate real values locally:

```bash
openssl rand -hex 32   # BETTER_AUTH_SECRET
```

## Install & verify

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test          # vitest unit + render tests
```

## Database

With **Neon**, create a project, grab its Postgres connection strings, and set
the production one as `DATABASE_URL`.

> **Pooled vs direct connection strings.** Neon exposes a **pooled** string
> (hostname contains `-pooler`) and a **direct** string. The application uses
> the node-postgres **`pg`** driver, so it works on Vercel Fluid compute with
> either, but use the **pooled** string for runtime traffic:
> `DATABASE_URL = postgresql://…-pooler.…neon.tech/neondb?sslmode=require`.
> **Migrations must use the direct (non-pooled) string** — Drizzle-kit needs a
> persistent connection that PgBouncer pooling breaks. Use the direct string
> only for `db:migrate`.

Migrations and seeding run **against the production database from your local
machine or CI** (they are not run inside the serverless runtime):

```bash
# set DATABASE_URL to the Neon DIRECT string for migrations, then:
pnpm db:migrate     # apply schema migrations (drizzle-kit, reads db/migrations/)
# set DATABASE_URL to the Neon POOLED string for runtime; seed can use either:
pnpm db:seed        # idempotent: creates owner + categories/tags/posts
```

Both `drizzle.config.ts` and `db/seed.ts` read env via `dotenv`/`.env.local`. For
the production run, either set `DATABASE_URL` in a temporary shell or a local
`.env.local` for these commands — the value must target **Neon**, not a local
database. Never commit `.env.local`.

> **Allow public connections.** Vercel Hobby functions have no fixed egress IPs,
> so Neon must be reachable over the public internet (the default). Do **not**
> IP-restrict your Neon project to Vercel-specific ranges.

`db:seed` is safe to re-run — it creates the owner only when missing and
upserts posts by slug.

## Storage tiers

The app ships one media abstraction with two backends selected by env:

| Tier | Use | Config |
| --- | --- | --- |
| Local | development / evaluation | no `S3_BUCKET`; writes to `public/uploads` (`UPLOAD_ROOT`) |
| S3-compatible (R2 preferred) | staging & production | set `S3_*`; images served via `S3_PUBLIC_BASE_URL` |

On serverless hosts (e.g. Vercel) local disk is ephemeral, so **production must
use the object-storage backend**. Recommended object store: **Cloudflare R2**
(no egress fees, S3-compatible). Create a bucket, an API token (R2 S3 API with
object read/write/delete), enable **public access**, and set the values above.
The exact public origin is automatically added to the CSP `img-src`, so no other
CSP change is needed.

- **Billing:** R2 is available on **any Cloudflare account, including the free
  plan** — it is metered pay-as-you-go (permanent free tier: 10 GB + 1M Class A
  writes + 10M Class B reads per month). No specific Cloudflare plan tier is
  required to use R2.
- **Public access — use a custom domain for production.** Buckets are **private
  by default** and must be explicitly made public. Cloudflare provides two
  options: a **custom domain** (recommended for production — also enables
  caching, WAF, and access controls) or a **Cloudflare-managed `r2.dev`
  subdomain** (explicitly documented as for **non-production** use). Set
  `S3_PUBLIC_BASE_URL` to your **HTTPS custom domain**
  (e.g. `https://media.example.com`), not the `r2.dev` URL.

> **R2 CORS is not required.** Uploads happen **server-side** (the Next.js API
> route signs requests through the app's own SigV4 client); the browser never
> PUTs to R2 directly. Images are rendered via plain public `<img>` URLs, which
> also do not require CORS. No CORS policy needs to be configured on the bucket.

## Scheduling

`/api/cron/publish-scheduled` promotes every post that is `scheduled` with
`publishedAt <= now`, then revalidates `/`, `/blog`, `/feed.xml`, and
`/sitemap.xml`.

- **Vercel Cron** (included config in `vercel.json`): Vercel automatically sends
  `CRON_SECRET` as `Authorization: Bearer <secret>` to the route.
  - **Hobby** (current default): cron runs **once per day**. `vercel.json` is set
    to `"0 8 * * *"` (daily 08:00 UTC). ⚠️ Hobby accounts are limited to daily
    cron jobs — a more frequent expression (e.g. `*/5 * * * *`) **fails
    deployment**. Scheduling precision is also only per-hour (±59 min), so a run
    may fire anytime within the chosen hour.
  - **Implication for scheduled publishing:** a post scheduled for a specific
    time is published on the **next daily run after its `publishedAt`**, so on
    Hobby a scheduled post may be delayed up to ~24h. The promotion is
    reconciliation-based, so this is safe — everything due is published on the
    next invocation; nothing is skipped.
  - **Upgrade to Pro** for higher frequency: change `vercel.json` to
    `"*/5 * * * *"` (or any ≥ 2-minute interval; Pro supports per-minute). This
    is a **one-line change** — commit the new `vercel.json` and redeploy. No code
    changes are required anywhere else.
- **Portable / non-Vercel**: call the route from any scheduler (systemd timer,
  cron on a VM, GitHub Actions, a paid uptime checker, etc.): `GET`/`POST` with
  `Authorization: Bearer $CRON_SECRET` or `?secret=$CRON_SECRET`. The route is a
  plain Route Handler and does not depend on Vercel.

The promotion is idempotent (only `scheduled` rows are flipped), so duplicate or
missed invocations are safe; concurrent runs cannot double-publish.

## Build & run

On **Vercel**, the platform runs the build and serves the production output
automatically from your Git pushes (framework preset **Next.js**; install
`pnpm install --frozen-lockfile`, build `pnpm build`). Locally, verify the same
commands work:

```bash
pnpm build          # next build (produces .next/)
pnpm start          # next start — serves the production build
```

Example on a private port behind a reverse proxy (self-hosted fallback only):

```bash
pnpm start -- --port 3100
```

Self-hosted serving topology (only if *not* using Vercel):

- TLS terminates at the **reverse proxy** (Caddy/nginx/cloud LB); the app runs
  on a loopback port.
- Point `BETTER_AUTH_URL` and `NEXT_PUBLIC_BASE_URL` at the public HTTPS origin.
- HSTS is already sent by the app over TLS (see SECURITY.md).

## Post-deploy checks

```bash
curl -fsS https://YOUR_ORIGIN/sitemap.xml | head -n 5
curl -fsS https://YOUR_ORIGIN/robots.txt
curl -fsS https://YOUR_ORIGIN/feed.xml | head -n 5
curl -fsSI https://YOUR_ORIGIN/ | grep -i -E "content-security-policy|x-frame-options|strict-transport"
```

## First-login procedure (deploy → secure → publish → verify)

1. **Deploy** the production build with the env vars above (DB, Better Auth,
   object storage, cron secret).
2. **Apply the schema** (`pnpm db:migrate`) and **seed the owner**
   (`pnpm db:seed`), which creates the owner from `OWNER_EMAIL` /
   `OWNER_BOOTSTRAP_PASSWORD` with `must_change_password=true`.
3. **Log in** at `/admin/login` using `OWNER_EMAIL` and the bootstrap password.
   On first login the app **forces** a password change at `/admin/password` —
   set the real long, unique password here.
4. **Configure the site** in `/admin/settings`: name, description, author,
   social/analytics, SEO defaults.
5. **Publish**: create a post in `/admin`, upload images (stored to object
   storage in production), set a slug, and publish. Verify the article is live
   with a canonical URL and Open Graph.
6. **Schedule**: set a post's status to *Scheduled* with a future `published_at`
   and confirm the cron promotes it at the given time (or trigger the cron route
   manually to test).
7. **Verify SEO/indexing**: `sitemap.xml`, `robots.txt`, `feed.xml`, canonical
   links, Open Graph, and JSON-LD for the published post; confirm draft/scheduled
   posts are excluded from public pages, feed, and sitemap.
8. Schedule **backups** per [BACKUP.md](./BACKUP.md).

Then confirm:

1. Reset the owner password at `/admin/password` on first login (step 3 above).
2. Run the Playwright E2E suite against the deployed origin
   (`pnpm test:e2e`) or the local production build.
3. Schedule backups per [BACKUP.md](./BACKUP.md).

## Rollout notes

- The app reads no files that change at request time; a rebuilt `.next/` is the
  release artifact. Zero-downtime deploys can start a fresh process before
  draining the old one.
- `sitemap.xml`, `feed.xml`, and search are force-dynamic, so new posts appear
  without a rebuild.