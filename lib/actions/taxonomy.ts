"use server";

import { requireOwnerReady } from "@/lib/auth-server";
import {
  deleteCategory,
  deleteTag,
  getOrCreateCategory,
  getOrCreateTag,
  updateCategory,
  updateTag,
} from "@/lib/services/categories-tags";
import type { ActionResult } from "@/lib/actions/types";

export async function createCategoryAction(input: { name: string; description?: string | null }): Promise<ActionResult<{ id: string; name: string }>> {
  await requireOwnerReady();
  try {
    const category = await getOrCreateCategory(input.name, input.description ?? undefined);
    return { ok: true, data: { id: category.id, name: category.name } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create category." };
  }
}

export async function updateCategoryAction(input: { id: string; name: string; description?: string | null }): Promise<ActionResult> {
  await requireOwnerReady();
  try {
    await updateCategory(input.id, { name: input.name, description: input.description ?? undefined });
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update category." };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireOwnerReady();
  try {
    await deleteCategory(id);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete category." };
  }
}

export async function createTagAction(name: string): Promise<ActionResult<{ id: string; name: string }>> {
  await requireOwnerReady();
  try {
    const tag = await getOrCreateTag(name);
    return { ok: true, data: { id: tag.id, name: tag.name } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create tag." };
  }
}

export async function updateTagAction(input: { id: string; name: string }): Promise<ActionResult> {
  await requireOwnerReady();
  try {
    await updateTag(input.id, { name: input.name });
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update tag." };
  }
}

export async function deleteTagAction(id: string): Promise<ActionResult> {
  await requireOwnerReady();
  try {
    await deleteTag(id);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete tag." };
  }
}