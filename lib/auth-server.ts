import "server-only";

import { redirect } from "next/navigation";

import { getSession, type AuthUser } from "@/lib/auth";

/**
 * The real security boundary for the admin CMS. Every admin page layout,
 * server action and route handler must pass through this (or requireOwnerJson).
 * The `proxy` middleware is UX-only and never relied upon for security.
 */
export async function requireOwner(): Promise<AuthUser> {
  const session = await getSession();
  if (!session?.user?.isOwner) {
    redirect("/admin/login");
  }
  return session.user as AuthUser;
}

/**
 * requireOwner + password-change gate, used by admin mutations and the
 * admin shell. When a forced password change is pending the user is sent to
 * the change screen instead of gaining access.
 */
export async function requireOwnerReady(): Promise<AuthUser> {
  const owner = await requireOwner();
  if (owner.mustChangePassword) {
    redirect("/admin/password");
  }
  return owner;
}

/** Route-handler variant: caller returns 401 instead of a redirect. */
export async function requireOwnerJson(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session?.user?.isOwner) return null;
  return session.user as AuthUser;
}

export function assertPasswordChanged(user: AuthUser) {
  if (user.mustChangePassword) {
    throw new Error("A password change is required before using the admin CMS.");
  }
}