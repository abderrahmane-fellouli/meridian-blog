import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { media } from "@/db/schema";
import { S3Client } from "@/lib/services/s3-storage";

export type MediaRow = typeof media.$inferSelect;

/* ── Validation ──────────────────────────────────────── */

const ALLOWED_MIME: Array<{ mime: string; ext: string }> = [
  { mime: "image/jpeg", ext: "jpg" },
  { mime: "image/png", ext: "png" },
  { mime: "image/webp", ext: "webp" },
  { mime: "image/gif", ext: "gif" },
];

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function validateMediaInput(
  data: Buffer | Uint8Array,
  mimeType: string
): { mimeType: string; ext: string } {
  const entry = ALLOWED_MIME.find((e) => e.mime.toLowerCase() === mimeType.toLowerCase());
  if (!entry) {
    throw new MediaValidationError(`Unsupported image type "${mimeType}". Allowed: image/jpeg, image/png, image/webp, image/gif.`);
  }
  if (data.length === 0) {
    throw new MediaValidationError("Uploaded file is empty.");
  }
  if (data.length > MAX_UPLOAD_BYTES) {
    throw new MediaValidationError(`File is too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB).`);
  }
  return { mimeType: entry.mime, ext: entry.ext };
}

export class MediaValidationError extends Error {}

/* ── Storage abstraction ────────────────────────────── */

export interface MediaStorage {
  save(data: { data: Buffer; mimeType: string; ext: string }): Promise<{ storagePath: string; urlPath: string }>;
  remove(storagePath: string): Promise<void>;
}

export class LocalMediaStorage implements MediaStorage {
  private readonly root: string;

  constructor(root: string = process.env.UPLOAD_ROOT ?? path.join(process.cwd(), "public", "uploads")) {
    this.root = path.resolve(root);
  }

  resolveRoot(): string {
    return this.root;
  }

  async save(input: { data: Buffer; mimeType: string; ext: string }): Promise<{ storagePath: string; urlPath: string }> {
    const now = new Date();
    const subdir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const dir = path.join(this.root, subdir);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${input.ext}`;
    const storagePath = path.join(dir, filename);
    await fs.writeFile(storagePath, input.data);
    return { storagePath, urlPath: `/uploads/${subdir}/${filename}` };
  }

  async remove(storagePath: string): Promise<void> {
    const resolved = path.resolve(storagePath);
    const root = path.resolve(this.root);
    if (resolved !== root && resolved.startsWith(root + path.sep)) {
      await fs.rm(resolved, { force: true });
    }
  }
}

export class S3MediaStorage implements MediaStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly publicBaseUrl: string;

  constructor(opts?: {
    client?: S3Client;
    bucket?: string;
    prefix?: string;
    publicBaseUrl?: string;
  }) {
    const cfg = s3ConfigFromEnv() ?? { client: opts?.client as S3Client, bucket: opts?.bucket as string };
    this.client = opts?.client ?? cfg.client;
    this.bucket = opts?.bucket ?? cfg.bucket;
    this.prefix = (opts?.prefix ?? cfg.prefix ?? "uploads").replace(/^\/+|\/+$/g, "");
    const base = opts?.publicBaseUrl ?? cfg.publicBaseUrl ?? this.defaultPublicBaseUrl();
    this.publicBaseUrl = base.replace(/\/+$/, "");
  }

  private defaultPublicBaseUrl(): string {
    // Without an explicit public origin, fall back to the bucket's
    // path-style URL on the configured endpoint.
    return `${process.env.S3_ENDPOINT ?? "https://s3.amazonaws.com"}/${this.bucket}`;
  }

  async save(input: { data: Buffer; mimeType: string; ext: string }): Promise<{ storagePath: string; urlPath: string }> {
    const now = new Date();
    const subdir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const key = `${this.prefix}/${subdir}/${randomUUID()}.${input.ext}`;
    await this.client.putObject(key, input.data, {
      contentType: input.mimeType,
      cacheControl: "public, max-age=31536000, immutable",
    });
    return { storagePath: key, urlPath: `${this.publicBaseUrl}/${encodeURIComponent(key).replace(/%2F/g, "/")}` };
  }

  async remove(storagePath: string): Promise<void> {
    if (!storagePath) return;
    await this.client.deleteObject(storagePath);
  }
}

export interface S3Config {
  client: S3Client;
  bucket: string;
  prefix?: string;
  publicBaseUrl?: string;
}

export function s3ConfigFromEnv(): S3Config | null {
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (!bucket) return null;
  return {
    client: new S3Client({
      endpoint: process.env.S3_ENDPOINT?.trim() || "https://s3.amazonaws.com",
      region: process.env.S3_REGION?.trim() || "us-east-1",
      accessKeyId: accessKeyId ?? "",
      secretAccessKey: secretAccessKey ?? "",
      bucket,
    }),
    bucket,
    prefix: process.env.S3_PREFIX?.trim() || "uploads",
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL?.trim() || undefined,
  };
}

let defaultStorage: MediaStorage | null = null;

/**
 * Selects the object-storage backend at the first call. Configured S3 (via
 * S3_BUCKET) wins; otherwise the local filesystem backend is used so that
 * existing local deployments keep working unchanged.
 */
export function mediaStorage(): MediaStorage {
  if (!defaultStorage) {
    const s3 = s3ConfigFromEnv();
    defaultStorage = s3 ? new S3MediaStorage({ client: s3.client, bucket: s3.bucket, prefix: s3.prefix, publicBaseUrl: s3.publicBaseUrl }) : new LocalMediaStorage();
  }
  return defaultStorage;
}

export function mediaUrlFromStorage(storagePath: string): string {
  const root = path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_ROOT ?? path.join(process.cwd(), "public", "uploads"));
  const resolved = path.resolve(storagePath);
  const rel = path.relative(root, resolved);
  return `/uploads/${rel.split(path.sep).join("/")}`;
}

/* ── Service ────────────────────────────────────────── */

export async function saveUpload(
  input: { data: Buffer | Uint8Array; mimeType: string; createdBy?: string | null },
  storage: MediaStorage = mediaStorage()
): Promise<MediaRow> {
  const data = Buffer.isBuffer(input.data) ? input.data : Buffer.from(input.data);
  const { mimeType, ext } = validateMediaInput(data, input.mimeType);
  const { storagePath, urlPath } = await storage.save({ data, mimeType, ext });

  let width: number | null = null;
  let height: number | null = null;
  try {
    const { default: sharp } = await import("sharp");
    const meta = await sharp(data).metadata();
    if (meta.width) width = meta.width;
    if (meta.height) height = meta.height;
  } catch {
    width = null;
    height = null;
  }

  const created = await db
    .insert(media)
    .values({
      storagePath,
      urlPath,
      mimeType,
      sizeBytes: data.length,
      width,
      height,
      createdBy: input.createdBy ?? null,
    })
    .returning();
  return created[0];
}

export async function listMedia(opts: { limit?: number; offset?: number } = {}): Promise<MediaRow[]> {
  return db
    .select()
    .from(media)
    .orderBy(desc(media.createdAt))
    .limit(Math.min(opts.limit ?? 50, 200))
    .offset(opts.offset ?? 0);
}

export async function getMediaById(id: string): Promise<MediaRow | null> {
  return db.select().from(media).where(eq(media.id, id)).then((r) => r[0] ?? null);
}

export async function deleteMedia(id: string, storage: MediaStorage = mediaStorage()): Promise<void> {
  const row = await db.select().from(media).where(eq(media.id, id)).then((r) => r[0] ?? null);
  if (!row) return;
  if (row.storagePath) {
    await storage.remove(row.storagePath);
  }
  await db.delete(media).where(eq(media.id, id));
}

export async function countMedia(): Promise<number> {
  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(media);
  return rows[0]?.count ?? 0;
}