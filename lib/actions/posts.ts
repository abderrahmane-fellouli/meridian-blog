"use server";

import { requireOwnerReady } from "@/lib/auth-server";
import { toAdminDto, type AdminPostDto } from "@/lib/admin-dto";
import {
  PostConflictError,
  createPost,
  deletePost,
  duplicatePost,
  updatePost,
  type PostUpdateInput,
} from "@/lib/services/posts";
import type { BodyDoc } from "@/lib/body";
import type { PostStatus } from "@/db/schema";
import type { ActionResult } from "@/lib/actions/types";

type SaveShape = {
  title: string;
  excerpt: string | null;
  bodyJson: BodyDoc;
  slug: string | null;
  categoryId: string | null;
  tagIds: string[];
  featuredImagePath: string | null;
  featuredImageAlt: string | null;
  featured: boolean;
  affiliateDisclosure: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  ogImagePath: string | null;
  noindex: boolean;
};

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createPostAction(input: SaveShape & { status: PostStatus; publishedAt: string | null }): Promise<ActionResult<AdminPostDto>> {
  const owner = await requireOwnerReady();
  try {
    const post = await createPost({
      title: input.title,
      excerpt: input.excerpt ?? undefined,
      bodyJson: input.bodyJson,
      status: input.status,
      slug: input.slug ?? undefined,
      categoryId: input.categoryId ?? null,
      featuredImagePath: input.featuredImagePath ?? null,
      featuredImageAlt: input.featuredImageAlt ?? null,
      featured: input.featured ?? false,
      affiliateDisclosure: input.affiliateDisclosure ?? false,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      canonicalUrl: input.canonicalUrl ?? null,
      ogImagePath: input.ogImagePath ?? null,
      noindex: input.noindex ?? false,
      authorId: owner.id,
      publishedAt: parseDate(input.publishedAt),
      tagIds: input.tagIds,
    });
    return { ok: true, data: toAdminDto(post) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create post." };
  }
}

export type SavePostResult =
  | { ok: true; post: AdminPostDto }
  | { ok: false; conflict: boolean; error: string };

export async function updatePostAction(
  id: string,
  input: Partial<SaveShape> & { status?: PostStatus; publishedAt?: string | null },
  expectedUpdatedAt: string | null
): Promise<SavePostResult> {
  await requireOwnerReady();
  const patch: PostUpdateInput = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.excerpt !== undefined) patch.excerpt = input.excerpt ?? null;
  if (input.bodyJson !== undefined) patch.bodyJson = input.bodyJson;
  if (input.slug !== undefined) patch.slug = input.slug ?? undefined;
  if (input.categoryId !== undefined) patch.categoryId = input.categoryId ?? null;
  if (input.tagIds !== undefined) patch.tagIds = input.tagIds;
  if (input.featuredImagePath !== undefined) patch.featuredImagePath = input.featuredImagePath ?? null;
  if (input.featuredImageAlt !== undefined) patch.featuredImageAlt = input.featuredImageAlt ?? null;
  if (input.featured !== undefined) patch.featured = input.featured;
  if (input.affiliateDisclosure !== undefined) patch.affiliateDisclosure = input.affiliateDisclosure;
  if (input.seoTitle !== undefined) patch.seoTitle = input.seoTitle ?? null;
  if (input.seoDescription !== undefined) patch.seoDescription = input.seoDescription ?? null;
  if (input.canonicalUrl !== undefined) patch.canonicalUrl = input.canonicalUrl ?? null;
  if (input.ogImagePath !== undefined) patch.ogImagePath = input.ogImagePath ?? null;
  if (input.noindex !== undefined) patch.noindex = input.noindex;
  if (input.status !== undefined) patch.status = input.status;
  if (input.publishedAt !== undefined) patch.publishedAt = parseDate(input.publishedAt);

  try {
    const post = await updatePost(id, patch, {
      expectedUpdatedAt: expectedUpdatedAt ? new Date(expectedUpdatedAt) : undefined,
    });
    return { ok: true, post: toAdminDto(post) };
  } catch (err) {
    if (err instanceof PostConflictError) return { ok: false, conflict: true, error: err.message };
    return { ok: false, conflict: false, error: err instanceof Error ? err.message : "Failed to save post." };
  }
}

export async function setPostStatusAction(
  id: string,
  status: PostStatus,
  publishedAt: string | null
): Promise<ActionResult<AdminPostDto>> {
  await requireOwnerReady();
  try {
    const post = await updatePost(id, {
      status,
      publishedAt: status === "published" ? undefined : parseDate(publishedAt),
    });
    return { ok: true, data: toAdminDto(post) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update status." };
  }
}

export async function deletePostAction(id: string): Promise<ActionResult> {
  await requireOwnerReady();
  try {
    await deletePost(id);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete post." };
  }
}

export async function duplicatePostAction(id: string): Promise<ActionResult<AdminPostDto>> {
  await requireOwnerReady();
  try {
    const post = await duplicatePost(id);
    return { ok: true, data: toAdminDto(post) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to duplicate post." };
  }
}