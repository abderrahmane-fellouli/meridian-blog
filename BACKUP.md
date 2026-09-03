# Meridian — Backup & Restore

Backups cover two things: the **PostgreSQL database** (content, users, auth
sessions, upload metadata) and the **uploaded files** (images under
`public/uploads/`, or the directory `UPLOAD_ROOT` points at).

## What to back up

| Source | Where | Notes |
| --- | --- | --- |
| Database | PostgreSQL via `DATABASE_URL` | Every table: posts, categories, tags, media, settings, users/sessions |
| Uploads | `public/uploads/YYYY/MM/` (or `UPLOAD_ROOT`) | Original images; generation shape is derived from `media` rows |

Backing up the database alone is not enough — without the files the `media`
rows point at broken images. Back up both.

## Database dump

The app uses standard PostgreSQL. Use your provider's tooling or `pg_dump`:

```bash
# logical dump (recommended, portable)
pg_dump "$DATABASE_URL" -Fc -f meridian-$(date +%F-%H%M).dump
```

For a plain-SQL dump:

```bash
pg_dump "$DATABASE_URL" > meridian-$(date +%F-%H%M).sql
```

`DATABASE_URL` is read from `.env.local` but never printed to the shell to
avoid leaking it into logs.

## Uploads backup

Copy the upload root verbatim:

```bash
# rsync-style copy of public/uploads (tar works too)
cp -a public/uploads backups/uploads/
```

## Restore

1. **Database**: stop traffic or accept a brief outage, then restore the dump:

   ```bash
   pg_restore --clean --if-exists -d "$DATABASE_URL" meridian-<date>.dump
   # or, for plain SQL: psql "$DATABASE_URL" -f meridian-<date>.sql
   ```

2. **Uploads**: restore the files into `public/uploads/` (or `UPLOAD_ROOT`) so
   the `urlPath` values stored in `media` resolve again.

3. **Verify**: load the site, confirm `/blog`, a post with images, `/media`
   in the admin, and `/sitemap.xml` render.

## Rotation

- Take a database dump at least **nightly** and on every schema migration
  (`pnpm db:migrate`) or content import.
- Copy uploads on the same cadence; image additions are small and cheap to sync.
- Keep at least **7 daily** dumps, plus a weekly snapshot. Store dumps
  off-server (object storage/another host) encrypted if they leave the VPC.
- Test restore to a scratch database quarterly — a backup that has never been
  restored is an assumption, not a backup.

## Consistency gotchas

- Dump with `pg_dump` while the app can still write: logical dumps are
  point-in-time consistent per table; for stricter consistency use
  `-Fc` with a snapshot provider or `pg_dump --serializable-deferrable`.
- If media lives on the same host as the DB, snapshot both from the same time
  window so no `media` row points at a missing file.