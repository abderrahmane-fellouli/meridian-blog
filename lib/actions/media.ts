"use server";

import { eq } from "drizzle-orm";
import { requireOwnerReady } from "@/lib/auth-server";
import { media } from "@/db/schema";
import { db } from "@/lib/db";
import { deleteMedia, getMediaById, listMedia, saveUpload, type MediaRow } from "@/lib/services/media";
import type { ActionResult, MediaDto } from "@/lib/actions/types";

function toMediaDto(row: MediaRow): MediaDto {
  return {
    id: row.id,
    urlPath: row.urlPath,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    altText: row.altText,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function uploadMediaAction(formData: FormData): Promise<ActionResult<MediaDto>> {
  const owner = await requireOwnerReady();
  const file = formData.get("file");
  const alt = String(formData.get("alt") ?? "").trim();
  if (!(file instanceof File)) {
    return { ok: false, error: "No file was provided." };
  }
  if (file.size === 0) {
    return { ok: false, error: "Uploaded file is empty." };
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const row = await saveUpload({ data: buffer, mimeType: file.type || "application/octet-stream", createdBy: owner.id });
    if (alt) {
      await db.update(media).set({ altText: alt }).where(eq(media.id, row.id));
    }
    const stored = await getMediaById(row.id);
    return { ok: true, data: toMediaDto(stored ?? row) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function listMediaAction(opts: { limit?: number; offset?: number } = {}): Promise<ActionResult<MediaDto[]>> {
  await requireOwnerReady();
  try {
    const rows = await listMedia(opts);
    return { ok: true, data: rows.map(toMediaDto) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to list media." };
  }
}

export async function deleteMediaAction(id: string): Promise<ActionResult> {
  await requireOwnerReady();
  try {
    await deleteMedia(id);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete media." };
  }
}