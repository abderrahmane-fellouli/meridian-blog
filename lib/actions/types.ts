/** Shared action-result types. Not a "use server" module — server action
    files re-export nothing but async functions, so action shapes live here. */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type AuthFormState = { error?: string; ok?: boolean };

export type MediaDto = {
  id: string;
  urlPath: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  createdAt: string;
};