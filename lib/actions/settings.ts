"use server";

import { requireOwnerReady } from "@/lib/auth-server";
import { getSettings, updateSettings, type SiteSettings } from "@/lib/services/settings";
import type { ActionResult } from "@/lib/actions/types";

export async function saveSettingsAction(patch: Partial<SiteSettings>): Promise<ActionResult<SiteSettings>> {
  await requireOwnerReady();
  try {
    const merged = await updateSettings(patch);
    return { ok: true, data: merged };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save settings." };
  }
}

export async function getSettingsAction(): Promise<ActionResult<SiteSettings>> {
  await requireOwnerReady();
  try {
    return { ok: true, data: await getSettings() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load settings." };
  }
}