"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { loginAttempt, user } from "@/db/schema";
import { auth, getSession } from "@/lib/auth";
import { requireOwner } from "@/lib/auth-server";
import { db } from "@/lib/db";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

import type { AuthFormState } from "@/lib/actions/types";

const credentialSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1),
});

async function requestIp(): Promise<string> {
  const store = await headers();
  return store.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function countRecentFailures(email: string): Promise<number> {
  const cutoff = new Date(Date.now() - LOCKOUT_MS);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempt)
    .where(
      and(
        eq(loginAttempt.email, email),
        eq(loginAttempt.succeeded, false),
        gt(loginAttempt.createdAt, cutoff)
      )
    );
  return rows[0]?.count ?? 0;
}

type ResponseCookieOptions = {
  path?: string;
  maxAge?: number;
  expires?: Date;
  domain?: string;
  sameSite?: "lax" | "strict" | "none" | boolean;
  secure?: boolean;
  httpOnly?: boolean;
};

/**
 * Persist the `Set-Cookie` headers produced by a better-auth API call onto the
 * current request's cookie store. When better-auth runs inside a Server
 * Action, the cookies it writes are captured on its internal response headers
 * rather than being automatically sent to the browser, so they must be applied
 * explicitly. Only the cookies we care about (session token and its cache) are
 * written; other Set-Cookie headers are ignored.
 */
async function applyAuthSetCookies(resultHeaders: Headers | null | undefined): Promise<void> {
  if (!resultHeaders) return;
  const store = await cookies();
  const headersList: string[] =
    typeof resultHeaders.getSetCookie === "function"
      ? resultHeaders.getSetCookie()
      : resultHeaders.get("set-cookie")
        ? [resultHeaders.get("set-cookie") as string]
        : [];
  const wanted = new Set(["better-auth.session_token", "better-auth.session_data"]);
  for (const header of headersList) {
    const cookie = parseSetCookie(header);
    if (!cookie || !wanted.has(cookie.name)) continue;
    if (cookie.value === "") {
      store.delete(cookie.name);
    } else {
      // The value returned in the Set-Cookie header is already percent-encoded
      // by better-auth. Next.js re-encodes whatever we pass to cookies().set(),
      // so decode first to avoid double-encoding the signed session token
      // (which would make the session fail to validate on the next request).
      let value = cookie.value;
      try {
        value = decodeURIComponent(value);
      } catch {
        // not percent-encoded; use as-is
      }
      store.set(cookie.name, value, cookie.options);
    }
  }
}

/** Minimal set-cookie header parser for the better-auth cookies we consume. */
function parseSetCookie(header: string): {
  name: string;
  value: string;
  options: ResponseCookieOptions;
} | null {
  const parts = header.split(";").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const firstEq = parts[0].indexOf("=");
  if (firstEq <= 0) return null;
  const name = parts[0].slice(0, firstEq).trim();
  const value = parts[0].slice(firstEq + 1).trim();
  const options: ResponseCookieOptions = {};
  for (let i = 1; i < parts.length; i++) {
    const attr = parts[i];
    const eq = attr.indexOf("=");
    const key = (eq === -1 ? attr : attr.slice(0, eq)).trim().toLowerCase();
    const val = eq === -1 ? undefined : attr.slice(eq + 1).trim();
    switch (key) {
      case "path":
        options.path = val;
        break;
      case "max-age":
        if (val !== undefined) options.maxAge = Number.parseInt(val, 10);
        break;
      case "expires":
        if (val !== undefined) options.expires = new Date(val);
        break;
      case "domain":
        options.domain = val;
        break;
      case "samesite":
        options.sameSite =
          val === "lax" || val === "strict" || val === "none" ? val : undefined;
        break;
      case "secure":
        options.secure = true;
        break;
      case "httponly":
        options.httpOnly = true;
        break;
    }
  }
  return { name, value, options };
}

export async function ownerLogin(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = credentialSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email address and password." };
  }
  const { email, password } = parsed.data;
  const ip = await requestIp();

  const lockoutRemaining = await countRecentFailures(email);
  if (lockoutRemaining >= MAX_FAILED_ATTEMPTS) {
    return {
      error: "Too many failed attempts. Try again in about 15 minutes.",
    };
  }

  let result;
  try {
    result = await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
      returnHeaders: true,
    });
  } catch {
    return { error: "Invalid email or password." };
  }

  const loginUser = result?.response?.user;

  if (!loginUser) {
    await db.insert(loginAttempt).values({ email, ip, succeeded: false });
    return { error: "Invalid email or password." };
  }

  if (!loginUser.isOwner) {
    await db.insert(loginAttempt).values({ email, ip, succeeded: false });
    return { error: "This account is not authorized to access the admin." };
  }

  // better-auth writes its session cookie to internal response headers that a
  // Server Action does not propagate to the browser; commit them explicitly.
  await applyAuthSetCookies(result.headers);

  await db
    .delete(loginAttempt)
    .where(and(eq(loginAttempt.email, email), eq(loginAttempt.succeeded, false)));
  await db
    .update(user)
    .set({ lastLoginAt: new Date() })
    .where(eq(user.email, email));

  return { ok: true };
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(12, "The new password must be at least 12 characters long.")
    .max(128),
});

export async function changePassword(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const owner = await requireOwner();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { currentPassword, newPassword } = parsed.data;

  try {
    await auth.api.changePassword({
      body: { currentPassword, newPassword },
      headers: await headers(),
    });
  } catch {
    return { error: "Your current password is incorrect." };
  }

  await db
    .update(user)
    .set({
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    })
    .where(eq(user.id, owner.id));

  return { ok: true };
}

export async function ownerSignOut(): Promise<void> {
  await getSession();
  try {
    const result = await auth.api.signOut({ headers: await headers(), returnHeaders: true });
    await applyAuthSetCookies(result.headers);
  } catch {
    // ignore: the client may already have an invalid session
  }
  redirect("/admin/login");
}

export async function isAuthLocked(email: string): Promise<boolean> {
  const parsed = z.email().safeParse(email);
  if (!parsed.success) return false;
  return (await countRecentFailures(parsed.data.toLowerCase().trim())) >= MAX_FAILED_ATTEMPTS;
}

export async function isCurrentlyLockedOut(): Promise<boolean> {
  const session = await getSession();
  if (!session?.user?.email) return false;
  return isAuthLocked(session.user.email);
}

export async function recentLoginFailureCount(email: string): Promise<number> {
  const parsed = z.email().safeParse(email);
  if (!parsed.success) return 0;
  return countRecentFailures(parsed.data.toLowerCase().trim());
}

export async function clearLoginAttempts(email: string): Promise<void> {
  const parsed = z.email().safeParse(email);
  if (!parsed.success) return;
  await db
    .delete(loginAttempt)
    .where(eq(loginAttempt.email, parsed.data.toLowerCase().trim()));
}