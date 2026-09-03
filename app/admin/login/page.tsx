import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";
import { getSession } from "@/lib/auth";
import { isCurrentlyLockedOut } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const locked = await isCurrentlyLockedOut();
  const session = await getSession();

  if (session?.user?.isOwner) {
    if (session.user.mustChangePassword) {
      const { permanentRedirect } = await import("next/navigation");
      permanentRedirect("/admin/password");
    }
    const { redirect } = await import("next/navigation");
    redirect("/admin/dashboard");
  }

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-[var(--bg)] px-4 py-10">
      <LoginForm locked={locked} />
    </main>
  );
}