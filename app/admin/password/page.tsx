import { PasswordChangeForm } from "@/components/admin/password-change-form";
import { getSession } from "@/lib/auth";
import { requireOwner } from "@/lib/auth-server";

export default async function AdminPasswordPage() {
  const owner = await requireOwner();

  if (!owner.mustChangePassword) {
    const { redirect } = await import("next/navigation");
    redirect("/admin/dashboard");
  }

  const session = await getSession();
  const email = session?.user?.email ?? owner.email;

  return (
    <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <PasswordChangeForm email={email} />
    </main>
  );
}